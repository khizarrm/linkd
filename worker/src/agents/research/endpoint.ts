import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { runResearchAgent } from "./research";
import type { CloudflareBindings } from "../../env.d";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { schema } from "../../db";
import { messages } from "../../db/messages.schema";
import { chats } from "../../db/chats.schema";
import { templates } from "../../db/templates.schema";
import { users } from "../../db/auth.schema";
import { verifyClerkToken } from "../../lib/clerk-auth";
import { processTemplateForPerson } from "../../endpoints/templates";
import {
  convertToModelMessages,
  consumeStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  pruneMessages,
  type ModelMessage,
  type UIMessage,
} from "ai";

const COMPACTION_MIN_MESSAGES = 40;
const COMPACTION_RECENT_MESSAGES = 12;

const TOOL_LABELS: Record<string, string> = {
  linkedin_search: "Searching LinkedIn",
  web_search: "Searching web",
  company_lookup: "Looking up company",
  find_and_verify_email: "Finding & verifying email",
};

type RequestFlags = {
  baselineTelemetry: boolean;
  sendLastMessageOnly: boolean;
  serverReconstructContext: boolean;
  pruneContext: boolean;
  compactContext: boolean;
  promptCache: boolean;
  optimizeToolLoop: boolean;
};

type RequestLogMeta = {
  requestId: string;
  chatId: string | null;
};

type UsageMetrics = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
};

function parseLegacyProfileBlurb(rawInfo: string | null | undefined): string | null {
  if (!rawInfo || rawInfo === "null") return null;
  try {
    const parsed = JSON.parse(rawInfo) as { profileBlurb?: unknown };
    if (typeof parsed?.profileBlurb !== "string") return null;
    const trimmed = parsed.profileBlurb.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

function isFlagEnabled(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function logStructured(
  enabled: boolean,
  event: string,
  meta: RequestLogMeta,
  payload: Record<string, unknown> = {},
) {
  if (!enabled) return;
  console.log(
    JSON.stringify({
      event,
      requestId: meta.requestId,
      chatId: meta.chatId,
      ...payload,
    }),
  );
}

function parseStoredParts(rawParts: string | null | undefined, fallbackText: string): any[] {
  if (!rawParts || rawParts === "null") {
    return [{ type: "text", text: fallbackText }];
  }

  try {
    const parsed = JSON.parse(rawParts);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore malformed JSON and fall back to plain text.
  }

  return [{ type: "text", text: fallbackText }];
}

function hasPersistableAssistantOutput(parts: Array<{ type?: string; text?: string }>): boolean {
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    if (part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0) {
      return true;
    }
    if (part.type !== "text") return true;
  }
  return false;
}

function extractMessageText(message?: UIMessage): string {
  if (!message) return "";
  if (Array.isArray(message.parts)) {
    const textParts = message.parts.filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" &&
        "text" in part &&
        typeof (part as { text?: string }).text === "string",
    );
    return textParts.map((part) => part.text).join("");
  }

  return typeof (message as { content?: string }).content === "string"
    ? (message as { content?: string }).content || ""
    : "";
}

function uniqueLines(items: string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item.length > 220 ? `${item.slice(0, 220).trimEnd()}...` : item);
    if (deduped.length >= maxItems) break;
  }

  return deduped;
}

function buildRollingSummary(olderMessages: UIMessage[]): string | null {
  if (olderMessages.length === 0) return null;

  const userTexts: string[] = [];
  const peopleFound: string[] = [];
  const emailsFound: string[] = [];

  for (const message of olderMessages) {
    if (message.role === "user") {
      const text = extractMessageText(message).trim();
      if (text) userTexts.push(text);
    }

    if (message.role !== "assistant" || !Array.isArray(message.parts)) continue;

    for (const part of message.parts) {
      if (part.type === "data-person" && "data" in part && part.data && typeof part.data === "object") {
        const personData = part.data as { name?: unknown; linkedinUrl?: unknown; snippet?: unknown };
        const name = typeof personData.name === "string" ? personData.name.trim() : "";
        const linkedinUrl = typeof personData.linkedinUrl === "string" ? personData.linkedinUrl.trim() : "";
        const snippet = typeof personData.snippet === "string" ? personData.snippet.trim() : "";
        if (!name) continue;
        peopleFound.push(linkedinUrl ? `${name} (${linkedinUrl})` : `${name}${snippet ? ` - ${snippet}` : ""}`);
      }

      if (part.type === "data-email" && "data" in part && part.data && typeof part.data === "object") {
        const emailData = part.data as {
          name?: unknown;
          email?: unknown;
          verificationStatus?: unknown;
        };
        const name = typeof emailData.name === "string" ? emailData.name.trim() : "";
        const email = typeof emailData.email === "string" ? emailData.email.trim() : "";
        const verification = typeof emailData.verificationStatus === "string"
          ? emailData.verificationStatus.trim()
          : "";
        if (!email) continue;
        emailsFound.push(`${name || "Unknown"}: ${email}${verification ? ` (${verification})` : ""}`);
      }
    }
  }

  const goalLines = uniqueLines(userTexts, 8);
  const targetLines = uniqueLines(
    userTexts.filter((text) =>
      /( at |company|recruiter|hiring manager|engineer|role|internship|job|position|new grad|campus)/i.test(text),
    ),
    8,
  );
  const constraintLines = uniqueLines(
    userTexts.filter((text) =>
      /(prefer|only|remote|hybrid|onsite|location|salary|visa|deadline|timeline|industry|no |without )/i.test(text),
    ),
    8,
  );
  const peopleLines = uniqueLines(peopleFound, 10);
  const emailLines = uniqueLines(emailsFound, 10);

  const lines: string[] = [];

  if (goalLines.length > 0) {
    lines.push("user goals:");
    for (const goal of goalLines) lines.push(`- ${goal}`);
  }

  if (targetLines.length > 0) {
    lines.push("target companies/roles:");
    for (const target of targetLines) lines.push(`- ${target}`);
  }

  if (peopleLines.length > 0) {
    lines.push("people already found:");
    for (const person of peopleLines) lines.push(`- ${person}`);
  }

  if (emailLines.length > 0) {
    lines.push("emails already found:");
    for (const email of emailLines) lines.push(`- ${email}`);
  }

  if (constraintLines.length > 0) {
    lines.push("constraints/preferences:");
    for (const constraint of constraintLines) lines.push(`- ${constraint}`);
  }

  if (lines.length === 0) {
    return "No structured summary available from older turns.";
  }

  return lines.join("\n");
}

function dataPartToModelText(part: any): { type: "text"; text: string } | undefined {
  if (!part || typeof part !== "object" || typeof part.type !== "string") return undefined;

  if (part.type === "data-person" && part.data && typeof part.data === "object") {
    const data = part.data as { name?: unknown; linkedinUrl?: unknown; snippet?: unknown };
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const linkedinUrl = typeof data.linkedinUrl === "string" ? data.linkedinUrl.trim() : "";
    const snippet = typeof data.snippet === "string" ? data.snippet.trim() : "";
    if (!name) return undefined;
    return { type: "text", text: `Person found: ${name}${snippet ? ` - ${snippet}` : ""}${linkedinUrl ? ` (${linkedinUrl})` : ""}` };
  }

  if (part.type === "data-email" && part.data && typeof part.data === "object") {
    const data = part.data as { name?: unknown; email?: unknown; domain?: unknown; verificationStatus?: unknown };
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const domain = typeof data.domain === "string" ? data.domain.trim() : "";
    const verification = typeof data.verificationStatus === "string" ? data.verificationStatus.trim() : "";
    if (!email) return undefined;
    return {
      type: "text",
      text: `Email found: ${name || "Unknown"} <${email}>${domain ? ` at ${domain}` : ""}${verification ? ` (${verification})` : ""}`,
    };
  }

  return undefined;
}

function sanitizeUiMessagesForModel(uiMessages: UIMessage[]): UIMessage[] {
  const safeMessages: UIMessage[] = [];

  for (const message of uiMessages) {
    const rawParts = Array.isArray(message.parts) ? message.parts : [];
    const safeParts = rawParts.filter((part) => {
      if (!part || typeof part !== "object" || typeof part.type !== "string") return false;
      return part.type === "text" || part.type === "data-person" || part.type === "data-email";
    });

    if (safeParts.length > 0) {
      safeMessages.push({
        id: message.id,
        role: message.role,
        parts: safeParts,
      });
      continue;
    }

    const fallbackText = extractMessageText(message).trim();
    if (fallbackText) {
      safeMessages.push({
        id: message.id,
        role: message.role,
        parts: [{ type: "text", text: fallbackText }],
      });
    }
  }

  return safeMessages;
}

async function convertUiMessagesToModelMessages(uiMessages: UIMessage[]): Promise<ModelMessage[]> {
  return convertToModelMessages(sanitizeUiMessagesForModel(uiMessages), {
    convertDataPart: (part) => dataPartToModelText(part as any),
  });
}

async function loadChatContext(options: {
  chatId: string;
  env: CloudflareBindings;
  compactContext: boolean;
  telemetryEnabled: boolean;
  logMeta: RequestLogMeta;
}): Promise<{
  modelMessages: ModelMessage[];
  rollingSummary: string | null;
  compacted: boolean;
}> {
  const dbClient = drizzle(options.env.DB, { schema });
  const chat = await dbClient.query.chats.findFirst({
    where: eq(chats.id, options.chatId),
    columns: {
      contextSummary: true,
      contextSummaryMessageCount: true,
    },
  });

  const chatMessages = await dbClient.query.messages.findMany({
    where: eq(messages.chatId, options.chatId),
    orderBy: [messages.createdAt],
  });

  const uiMessages: UIMessage[] = chatMessages.map((messageRow) => ({
    id: messageRow.id,
    role: messageRow.role === "assistant" ? "assistant" : "user",
    parts: parseStoredParts(messageRow.parts, messageRow.content || ""),
  }));

  if (!options.compactContext || uiMessages.length <= COMPACTION_MIN_MESSAGES) {
    return {
      modelMessages: await convertUiMessagesToModelMessages(uiMessages),
      rollingSummary: null,
      compacted: false,
    };
  }

  const summaryMessageCount = Math.max(0, uiMessages.length - COMPACTION_RECENT_MESSAGES);
  const olderMessages = uiMessages.slice(0, summaryMessageCount);
  const recentMessages = uiMessages.slice(summaryMessageCount);
  const cachedSummary = chat?.contextSummary?.trim() || "";
  const shouldRebuildSummary =
    !cachedSummary || (chat?.contextSummaryMessageCount ?? 0) !== summaryMessageCount;

  let rollingSummary = cachedSummary;
  if (shouldRebuildSummary) {
    rollingSummary = buildRollingSummary(olderMessages) || "";
    const now = new Date().toISOString();

    await dbClient
      .update(chats)
      .set({
        contextSummary: rollingSummary || null,
        contextSummaryMessageCount: summaryMessageCount,
        contextSummaryUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(chats.id, options.chatId));

    logStructured(options.telemetryEnabled, "research.context.compaction.updated", options.logMeta, {
      totalMessages: uiMessages.length,
      summaryMessageCount,
      recentMessageCount: recentMessages.length,
      summaryLength: rollingSummary.length,
    });
  }

  return {
    modelMessages: await convertUiMessagesToModelMessages(recentMessages),
    rollingSummary: rollingSummary || null,
    compacted: true,
  };
}

export class ResearchAgentRoute extends OpenAPIRoute {
  schema = {
    tags: ["Agents"],
    summary: "Research Agent with Claude",
    description:
      "A research assistant that helps find professionals and leads using Claude with streaming support.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              messages: z
                .array(z.any())
                .optional()
                .describe("Chat messages in AI SDK UI format"),
              query: z
                .string()
                .min(1)
                .optional()
                .describe("Fallback user query when messages not provided"),
              chatId: z
                .string()
                .optional()
                .describe("Optional chat ID for database persistence"),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Streaming response from the agent",
        content: {
          "text/event-stream": {
            schema: z.object({
              chunk: z.string().optional(),
              done: z.boolean().optional(),
              conversationId: z.string().optional(),
              error: z.string().optional(),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    const env: CloudflareBindings = c.env;
    const reqData = await this.getValidatedData<typeof this.schema>();
    const body = reqData.body!;
    const { messages: uiMessages, query, chatId } = body;
    const request = c.req.raw;

    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const logMeta: RequestLogMeta = { requestId, chatId: chatId ?? null };
    const requestStartedAtMs = Date.now();

    const flags: RequestFlags = {
      baselineTelemetry: isFlagEnabled(env.RESEARCH_BASELINE_TELEMETRY),
      sendLastMessageOnly: isFlagEnabled(env.RESEARCH_SEND_LAST_MESSAGE_ONLY),
      serverReconstructContext: isFlagEnabled(env.RESEARCH_SERVER_RECONSTRUCT_CONTEXT),
      pruneContext: isFlagEnabled(env.RESEARCH_PRUNE_CONTEXT),
      compactContext: isFlagEnabled(env.RESEARCH_COMPACT_CONTEXT),
      promptCache: isFlagEnabled(env.RESEARCH_PROMPT_CACHE),
      optimizeToolLoop: isFlagEnabled(env.RESEARCH_OPTIMIZE_TOOL_LOOP),
    };

    logStructured(flags.baselineTelemetry, "research.request.start", logMeta, {
      hasMessages: Array.isArray(uiMessages),
      messageCount: Array.isArray(uiMessages) ? uiMessages.length : 0,
      hasQuery: typeof query === "string" && query.length > 0,
      flags,
    });

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (chatId && !authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let ownedChat: typeof chats.$inferSelect | null = null;
    if (chatId && authResult) {
      const db = drizzle(env.DB, { schema });
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      });

      if (!chat) return Response.json({ error: "Chat not found" }, { status: 404 });
      if (chat.clerkUserId !== authResult.clerkUserId) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      ownedChat = chat;
    }

    let userContext: string | null = null;
    if (authResult) {
      const db = drizzle(env.DB, { schema });
      const user = await db.query.users.findFirst({
        where: eq(users.clerkUserId, authResult.clerkUserId),
        columns: {
          onboardingContext: true,
          info: true,
        },
      });
      userContext =
        user?.onboardingContext?.trim() ||
        parseLegacyProfileBlurb(user?.info) ||
        null;
    }

    let coreMessages: ModelMessage[] = [];
    let rollingSummary: string | null = null;
    let userMessageText = "";
    let usedServerReconstructPath = false;
    let usedCompaction = false;

    if (Array.isArray(uiMessages) && uiMessages.length > 0) {
      const lastUserMessage = [...uiMessages].reverse().find((message) => message.role === "user") as UIMessage | undefined;
      userMessageText = extractMessageText(lastUserMessage);

      const shouldServerReconstruct =
        Boolean(chatId) &&
        flags.serverReconstructContext &&
        flags.sendLastMessageOnly &&
        uiMessages.length === 1 &&
        uiMessages[0]?.role === "user";

      if (shouldServerReconstruct && chatId) {
        const loadedContext = await loadChatContext({
          chatId,
          env,
          compactContext: flags.compactContext,
          telemetryEnabled: flags.baselineTelemetry,
          logMeta,
        });

        usedServerReconstructPath = true;
        usedCompaction = loadedContext.compacted;
        rollingSummary = loadedContext.rollingSummary;

        const incomingModelMessages = await convertUiMessagesToModelMessages(uiMessages as UIMessage[]);
        coreMessages = [...loadedContext.modelMessages, ...incomingModelMessages];
      } else {
        coreMessages = await convertUiMessagesToModelMessages(uiMessages as UIMessage[]);
      }
    } else if (query) {
      if (chatId) {
        const loadedContext = await loadChatContext({
          chatId,
          env,
          compactContext: flags.compactContext,
          telemetryEnabled: flags.baselineTelemetry,
          logMeta,
        });

        usedServerReconstructPath = true;
        usedCompaction = loadedContext.compacted;
        rollingSummary = loadedContext.rollingSummary;
        coreMessages = [...loadedContext.modelMessages, { role: "user", content: query }];
      } else {
        coreMessages = [{ role: "user", content: query }];
      }
      userMessageText = query;
    } else {
      return Response.json({ error: "Messages or query required" }, { status: 400 });
    }

    if (flags.pruneContext) {
      coreMessages = pruneMessages({
        messages: coreMessages,
        reasoning: "before-last-message",
        toolCalls: "before-last-3-messages",
        emptyMessages: "remove",
      });
    }

    logStructured(flags.baselineTelemetry, "research.context.ready", logMeta, {
      usedServerReconstructPath,
      usedCompaction,
      rollingSummaryPresent: Boolean(rollingSummary),
      coreMessageCount: coreMessages.length,
    });

    if (chatId && authResult && ownedChat && userMessageText) {
      const db = drizzle(env.DB, { schema });
      const now = new Date().toISOString();
      const userMessageId = crypto.randomUUID();
      const partsToStore = JSON.stringify([{ type: "text", text: userMessageText }]);

      await db.insert(messages).values({
        id: userMessageId,
        chatId,
        role: "user",
        content: userMessageText,
        parts: partsToStore,
        createdAt: now,
      });

      await db
        .update(chats)
        .set({ updatedAt: now })
        .where(eq(chats.id, chatId));
    }

    let stepCounter = 0;
    let emailCounter = 0;
    let personCounter = 0;
    let firstTokenAtMs: number | null = null;
    let streamFinishedAtMs: number | null = null;
    let modelStepCount = 0;
    let modelToolCallCount = 0;
    let modelFinishReason: string | null = null;
    const modelUsage: UsageMetrics = {};

    const seenProfileUrls = new Set<string>();
    const toolStartTimes = new Map<string, { toolName: string; startedAtMs: number }>();

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const pendingTemplateProcesses: Promise<void>[] = [];

        const onToolStart = (toolName: string) => {
          const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
          const stepId = `step_${++stepCounter}`;
          toolStartTimes.set(stepId, { toolName, startedAtMs: Date.now() });

          logStructured(flags.baselineTelemetry, "research.tool.start", logMeta, {
            stepId,
            toolName,
            label,
          });

          writer.write({
            type: "data-step",
            id: stepId,
            data: { id: stepId, label, status: "running" },
          });

          return stepId;
        };

        const onToolEnd = (toolName: string, stepId?: string, failed?: boolean) => {
          const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
          if (!stepId) return;

          const status = failed ? "failed" : "done";
          const timing = toolStartTimes.get(stepId);
          const durationMs = timing ? Date.now() - timing.startedAtMs : null;

          logStructured(flags.baselineTelemetry, "research.tool.finish", logMeta, {
            stepId,
            toolName,
            label,
            status,
            durationMs,
          });

          writer.write({
            type: "data-step",
            id: stepId,
            data: { id: stepId, label, status },
          });
        };

        const onEmailFound = (data: {
          name: string;
          email: string;
          domain: string;
          verificationStatus: "verified" | "possible";
        }) => {
          const emailId = `email_${++emailCounter}`;

          writer.write({
            type: "data-email",
            id: emailId,
            data: {
              id: emailId,
              name: data.name,
              email: data.email,
              domain: data.domain,
              verificationStatus: data.verificationStatus,
            },
          });

          if (!authResult) return;
          const p = (async () => {
            try {
              const db = drizzle(env.DB, { schema });
              const defaultTemplate = await db.query.templates.findFirst({
                where: and(
                  eq(templates.clerkUserId, authResult.clerkUserId),
                  eq(templates.isDefault, 1),
                ),
              });
              if (!defaultTemplate) return;

              const result = await processTemplateForPerson(env, {
                template: {
                  subject: defaultTemplate.subject,
                  body: defaultTemplate.body,
                  footer: defaultTemplate.footer ?? null,
                  attachments: defaultTemplate.attachments ?? null,
                },
                person: { name: data.name, email: data.email },
                company: data.domain,
              });

              writer.write({
                type: "data-email-content",
                id: `${emailId}_content`,
                data: {
                  emailId,
                  templateId: defaultTemplate.id,
                  subject: result.subject,
                  body: result.body,
                  footer: result.footer,
                  attachments: result.attachments,
                },
              });
            } catch (error) {
              logStructured(flags.baselineTelemetry, "research.email_template.prefill_failed", logMeta, {
                email: data.email,
                error: String(error),
              });
            }
          })();

          pendingTemplateProcesses.push(p);
        };

        const onPeopleFound = (profiles: Array<{
          name: string;
          url: string;
          snippet: string;
        }>) => {
          const newProfiles = profiles.filter((profile) => !seenProfileUrls.has(profile.url));
          for (const profile of newProfiles) {
            seenProfileUrls.add(profile.url);
            const personId = `person_${++personCounter}`;
            writer.write({
              type: "data-person",
              id: personId,
              data: {
                id: personId,
                name: profile.name,
                linkedinUrl: profile.url,
                snippet: profile.snippet,
              },
            });
          }
        };

        const researchStream = await runResearchAgent({
          env,
          messages: coreMessages,
          userContext,
          rollingSummary,
          promptCache: flags.promptCache,
          optimizeToolLoop: flags.optimizeToolLoop,
          abortSignal: request.signal,
          onToolStart,
          onToolEnd,
          onEmailFound,
          onPeopleFound,
          onFirstToken: () => {
            if (firstTokenAtMs !== null) return;
            firstTokenAtMs = Date.now();
            logStructured(flags.baselineTelemetry, "research.first_token", logMeta, {
              latencyMs: firstTokenAtMs - requestStartedAtMs,
            });
          },
          onModelFinish: ({
            finishReason,
            stepCount,
            toolCallCount,
            inputTokens,
            outputTokens,
            cachedInputTokens,
            reasoningTokens,
          }) => {
            modelFinishReason = finishReason;
            modelStepCount = stepCount;
            modelToolCallCount = toolCallCount;
            modelUsage.inputTokens = inputTokens;
            modelUsage.outputTokens = outputTokens;
            modelUsage.cachedInputTokens = cachedInputTokens;
            modelUsage.reasoningTokens = reasoningTokens;
          },
        });

        writer.merge(researchStream.toUIMessageStream());
        await Promise.allSettled(pendingTemplateProcesses);
      },
      onFinish: async ({ responseMessage, isAborted }) => {
        streamFinishedAtMs = Date.now();

        if (chatId && authResult && ownedChat && responseMessage && responseMessage.role === "assistant") {
          const db = drizzle(env.DB, { schema });
          const now = new Date().toISOString();
          const responseParts = Array.isArray(responseMessage.parts) ? responseMessage.parts : [];
          if (hasPersistableAssistantOutput(responseParts as Array<{ type?: string; text?: string }>)) {
            const textContent = responseParts
              .filter((part) => part.type === "text")
              .map((part) => (part as { text: string }).text)
              .join("");

            const partsToStore = responseParts.length > 0
              ? JSON.stringify(responseParts)
              : null;

            await db.insert(messages).values({
              id: responseMessage.id,
              chatId,
              role: responseMessage.role,
              content: textContent,
              parts: partsToStore,
              createdAt: now,
            });

            await db
              .update(chats)
              .set({ updatedAt: now })
              .where(eq(chats.id, chatId));
          }
        }

        logStructured(flags.baselineTelemetry, "research.request.summary", logMeta, {
          durationMs: streamFinishedAtMs - requestStartedAtMs,
          firstTokenMs: firstTokenAtMs === null ? null : firstTokenAtMs - requestStartedAtMs,
          streamTailMs: firstTokenAtMs === null ? null : streamFinishedAtMs - firstTokenAtMs,
          stepCount: modelStepCount,
          toolCallCount: modelToolCallCount,
          finishReason: modelFinishReason,
          inputTokens: modelUsage.inputTokens,
          outputTokens: modelUsage.outputTokens,
          cachedInputTokens: modelUsage.cachedInputTokens,
          reasoningTokens: modelUsage.reasoningTokens,
          usedServerReconstructPath,
          usedCompaction,
          prunedContext: flags.pruneContext,
          isAborted: Boolean(isAborted),
        });
      },
    });

    return createUIMessageStreamResponse({
      stream,
      consumeSseStream: consumeStream,
    });
  }
}
