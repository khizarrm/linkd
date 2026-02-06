import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { chats } from "../db/chats.schema";
import { messages } from "../db/messages.schema";
import { verifyClerkToken } from "../lib/clerk-auth";

const ChatSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  openaiConversationId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const MessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export class ProtectedChatsListRoute extends OpenAPIRoute {
  schema = {
    tags: ["Chats"],
    summary: "List user's chats",
    responses: {
      "200": {
        description: "Chats retrieved",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              chats: z.array(ChatSchema),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const db = drizzle(env.DB, { schema });
    
    const userChats = await db.query.chats.findMany({
      where: eq(chats.clerkUserId, clerkUserId),
      orderBy: [desc(chats.updatedAt)],
    });

    return {
      success: true,
      chats: userChats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        openaiConversationId: chat.openaiConversationId,
        createdAt: chat.createdAt || new Date().toISOString(),
        updatedAt: chat.updatedAt || new Date().toISOString(),
      })),
    };
  }
}

export class ProtectedChatsCreateRoute extends OpenAPIRoute {
  schema = {
    tags: ["Chats"],
    summary: "Create a new chat",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Chat created",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              chat: ChatSchema,
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const body = await this.getValidatedData<typeof this.schema>().then(d => d.body);
    const title = body?.title || null;
    
    const db = drizzle(env.DB, { schema });
    const now = new Date().toISOString();
    
    const newChat = {
      id: crypto.randomUUID(),
      clerkUserId,
      title,
      openaiConversationId: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(chats).values(newChat);

    return {
      success: true,
      chat: newChat,
    };
  }
}

export class ProtectedChatsGetRoute extends OpenAPIRoute {
  schema = {
    tags: ["Chats"],
    summary: "Get a chat with its messages",
    request: {
      params: z.object({
        id: z.string().describe("Chat ID"),
      }),
    },
    responses: {
      "200": {
        description: "Chat retrieved",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              chat: ChatSchema,
              messages: z.array(MessageSchema),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Chat not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id } = await this.getValidatedData<typeof this.schema>().then(d => d.params);
    const db = drizzle(env.DB, { schema });

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, id),
      orderBy: [messages.createdAt],
    });

    return {
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        openaiConversationId: chat.openaiConversationId,
        createdAt: chat.createdAt || new Date().toISOString(),
        updatedAt: chat.updatedAt || new Date().toISOString(),
      },
      messages: chatMessages.map((msg) => ({
        id: msg.id,
        role: msg.role || "user",
        content: msg.content || "",
        createdAt: msg.createdAt || new Date().toISOString(),
      })),
    };
  }
}

export class ProtectedChatsUpdateRoute extends OpenAPIRoute {
  schema = {
    tags: ["Chats"],
    summary: "Update a chat",
    request: {
      params: z.object({
        id: z.string().describe("Chat ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: z.string().optional(),
              openaiConversationId: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Chat updated",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              chat: ChatSchema,
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Chat not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id } = await this.getValidatedData<typeof this.schema>().then(d => d.params);
    const { title, openaiConversationId } = await this.getValidatedData<typeof this.schema>().then(d => d.body);
    const db = drizzle(env.DB, { schema });

    const existingChat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!existingChat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    if (existingChat.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, string> = { updatedAt: now };
    if (title !== undefined) updateData.title = title;
    if (openaiConversationId !== undefined) updateData.openaiConversationId = openaiConversationId;

    await db.update(chats)
      .set(updateData)
      .where(eq(chats.id, id));

    const updatedChat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    return {
      success: true,
      chat: {
        id: updatedChat!.id,
        title: updatedChat!.title,
        openaiConversationId: updatedChat!.openaiConversationId,
        createdAt: updatedChat!.createdAt || new Date().toISOString(),
        updatedAt: updatedChat!.updatedAt || new Date().toISOString(),
      },
    };
  }
}

export class ProtectedChatsDeleteRoute extends OpenAPIRoute {
  schema = {
    tags: ["Chats"],
    summary: "Delete a chat",
    request: {
      params: z.object({
        id: z.string().describe("Chat ID"),
      }),
    },
    responses: {
      "200": {
        description: "Chat deleted",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Chat not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id } = await this.getValidatedData<typeof this.schema>().then(d => d.params);
    const db = drizzle(env.DB, { schema });

    const existingChat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!existingChat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    if (existingChat.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(chats).where(eq(chats.id, id));

    return { success: true };
  }
}

export class ProtectedMessagesCreateRoute extends OpenAPIRoute {
  schema = {
    tags: ["Chats"],
    summary: "Add a message to a chat",
    request: {
      params: z.object({
        id: z.string().describe("Chat ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Message created",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              message: MessageSchema,
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Chat not found",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const authResult = await verifyClerkToken(request, env.CLERK_SECRET_KEY);
    if (!authResult) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId } = authResult;
    const { id: chatId } = await this.getValidatedData<typeof this.schema>().then(d => d.params);
    const { role, content } = await this.getValidatedData<typeof this.schema>().then(d => d.body);
    const db = drizzle(env.DB, { schema });

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.clerkUserId !== clerkUserId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const newMessage = {
      id: crypto.randomUUID(),
      chatId,
      role,
      content,
      createdAt: now,
    };

    await db.insert(messages).values(newMessage);

    await db.update(chats)
      .set({ updatedAt: now })
      .where(eq(chats.id, chatId));

    return {
      success: true,
      message: newMessage,
    };
  }
}
