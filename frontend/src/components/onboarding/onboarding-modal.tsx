"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as LinkIcon, Plus, Trash2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { parseFooter, serializeFooter, type FooterData } from "@/lib/template-footer";

const INTENT_OPTIONS = [
  "recruiter outreach",
  "networking",
  "referrals",
  "job applications",
  "partnerships",
  "sales outreach",
] as const;

type OnboardingModalProps = {
  open: boolean;
  isSaving?: boolean;
  defaultValues?: {
    outreachIntents?: string[];
    profileBlurb?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    additionalUrls?: Array<{ label: string; url: string }>;
    onboardingStep?: number;
  };
  onStepSave: (data: {
    outreachIntents?: string[];
    profileBlurb?: string;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    additionalUrls?: Array<{ label: string; url: string }>;
    onboardingStep: number;
  }) => Promise<void> | void;
  onGenerateTemplate: (data: {
    outreachIntents: string[];
    profileBlurb: string;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    additionalUrls: Array<{ label: string; url: string }>;
  }) => Promise<{
    name: string;
    subject: string;
    body: string;
    footer: string | null;
    attachments: string | null;
  }>;
  onSubmit: (data: {
    outreachIntents: string[];
    profileBlurb: string;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    additionalUrls: Array<{ label: string; url: string }>;
    templateDraft: {
      name: string;
      subject: string;
      body: string;
      footer: string | null;
      attachments: string | null;
    };
  }) => Promise<void> | void;
};

type StepConfig = {
  id: "outreach_intents" | "profile" | "template";
  title: string;
  prompt: string;
};

interface TemplateAttachment {
  filename: string;
  mimeType: string;
  data: string;
  size: number;
}

const STEPS: StepConfig[] = [
  {
    id: "outreach_intents",
    title: "Slide 1",
    prompt: "What’s your intent for outreach?",
  },
  {
    id: "profile",
    title: "Slide 2",
    prompt: "Tell us about your profile",
  },
  {
    id: "template",
    title: "Slide 3",
    prompt: "Your first template",
  },
];

export function OnboardingModal({
  open,
  isSaving = false,
  defaultValues,
  onStepSave,
  onGenerateTemplate,
  onSubmit,
}: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [customIntent, setCustomIntent] = useState("");
  const [customUrlLabel, setCustomUrlLabel] = useState("");
  const [customUrlValue, setCustomUrlValue] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  const [selectedIntents, setSelectedIntents] = useState<string[]>(() => {
    const unique = new Set(
      (defaultValues?.outreachIntents || [])
        .map((value) => value.trim())
        .filter(Boolean),
    );
    return Array.from(unique);
  });
  const [profileBlurb, setProfileBlurb] = useState(defaultValues?.profileBlurb || "");
  const [linkedinUrl, setLinkedinUrl] = useState(defaultValues?.linkedinUrl || "");
  const [websiteUrl, setWebsiteUrl] = useState(defaultValues?.websiteUrl || "");
  const [additionalUrls, setAdditionalUrls] = useState<Array<{ label: string; url: string }>>(
    defaultValues?.additionalUrls || [],
  );

  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateFooter, setTemplateFooter] = useState<FooterData>({ text: "", links: [] });
  const [templateAttachments, setTemplateAttachments] = useState<TemplateAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unique = new Set(
      (defaultValues?.outreachIntents || [])
        .map((value) => value.trim())
        .filter(Boolean),
    );
    setSelectedIntents(Array.from(unique));
    setProfileBlurb(defaultValues?.profileBlurb || "");
    setLinkedinUrl(defaultValues?.linkedinUrl || "");
    setWebsiteUrl(defaultValues?.websiteUrl || "");
    setAdditionalUrls(defaultValues?.additionalUrls || []);
    setCustomUrlLabel("");
    setCustomUrlValue("");
    setUrlError(null);
    setTemplateError(null);
    setTemplateName("");
    setTemplateSubject("");
    setTemplateBody("");
    setTemplateFooter({ text: "", links: [] });
    setTemplateAttachments([]);
    const savedStep = defaultValues?.onboardingStep ?? 1;
    setStepIndex(Math.max(0, Math.min(savedStep - 1, STEPS.length - 1)));
  }, [defaultValues, open]);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const canContinue = useMemo(() => {
    if (isSaving || isGeneratingTemplate) return false;

    if (step.id === "outreach_intents") {
      return selectedIntents.length > 0;
    }

    if (step.id === "template") {
      return (
        templateName.trim().length > 0 &&
        templateSubject.trim().length > 0 &&
        templateBody.trim().length > 0
      );
    }

    return true;
  }, [
    isSaving,
    isGeneratingTemplate,
    selectedIntents,
    step.id,
    templateName,
    templateSubject,
    templateBody,
  ]);

  const toggleIntent = (intent: string) => {
    setSelectedIntents((prev) => {
      const key = intent.trim();
      if (!key) return prev;
      const exists = prev.some((item) => item.toLowerCase() === key.toLowerCase());
      if (exists) {
        return prev.filter((item) => item.toLowerCase() !== key.toLowerCase());
      }
      return [...prev, key];
    });
  };

  const addCustomIntent = () => {
    const trimmed = customIntent.trim();
    if (!trimmed) return;
    toggleIntent(trimmed);
    setCustomIntent("");
  };

  const addCustomUrl = () => {
    const label = customUrlLabel.trim();
    const url = customUrlValue.trim();
    if (!label || !url) return;
    if (!isValidHttpUrl(url)) {
      setUrlError("Please enter a valid URL including http:// or https://");
      return;
    }
    const exists = additionalUrls.some(
      (item) =>
        item.label.toLowerCase() === label.toLowerCase() &&
        item.url.toLowerCase() === url.toLowerCase(),
    );
    if (!exists) {
      setAdditionalUrls((prev) => [...prev, { label, url }]);
    }
    setCustomUrlLabel("");
    setCustomUrlValue("");
    setUrlError(null);
  };

  const addFooterLink = () => {
    setTemplateFooter((prev) => ({
      ...prev,
      links: [...prev.links, { label: "", url: "" }],
    }));
  };

  const removeFooterLink = (index: number) => {
    setTemplateFooter((prev) => ({
      ...prev,
      links: prev.links.filter((_, linkIndex) => linkIndex !== index),
    }));
  };

  const updateFooterLink = (index: number, key: "label" | "url", value: string) => {
    setTemplateFooter((prev) => ({
      ...prev,
      links: prev.links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [key]: value } : link,
      ),
    }));
  };

  const handleGenerateTemplate = useCallback(async () => {
    try {
      setTemplateError(null);
      setIsGeneratingTemplate(true);
      const generated = await onGenerateTemplate({
        outreachIntents: selectedIntents,
        profileBlurb: profileBlurb.trim(),
        linkedinUrl: linkedinUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        additionalUrls,
      });

      setTemplateName(generated.name || "");
      setTemplateSubject(generated.subject || "");
      setTemplateBody(generated.body || "");
      setTemplateFooter(parseFooter(generated.footer));
      setTemplateAttachments(parseAttachments(generated.attachments));
    } catch (error) {
      console.error("Failed to generate onboarding template:", error);
      setTemplateError("Could not generate template draft. Please go back and try again.");
    } finally {
      setIsGeneratingTemplate(false);
    }
  }, [
    onGenerateTemplate,
    selectedIntents,
    profileBlurb,
    linkedinUrl,
    websiteUrl,
    additionalUrls,
  ]);

  useEffect(() => {
    if (!open || step.id !== "template") return;
    if (templateBody.trim().length > 0) return;
    if (isGeneratingTemplate || isSaving) return;
    void handleGenerateTemplate();
  }, [
    open,
    step.id,
    templateBody,
    isGeneratingTemplate,
    isSaving,
    handleGenerateTemplate,
  ]);

  if (!open) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        console.error(`File "${file.name}" exceeds 5MB limit for template attachments`);
        continue;
      }
      const data = await fileToBase64(file);
      setTemplateAttachments((prev) => [
        ...prev,
        {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          data,
          size: file.size,
        },
      ]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setTemplateAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canContinue) return;
    if (!isLastStep) {
      if (step.id === "outreach_intents") {
        await onStepSave({
          outreachIntents: selectedIntents,
          onboardingStep: 2,
        });
      }
      if (step.id === "profile") {
        if (linkedinUrl.trim() && !isValidHttpUrl(linkedinUrl.trim())) {
          setUrlError("LinkedIn URL must be a valid URL including http:// or https://");
          return;
        }
        if (websiteUrl.trim() && !isValidHttpUrl(websiteUrl.trim())) {
          setUrlError("Website URL must be a valid URL including http:// or https://");
          return;
        }
        setUrlError(null);
        await onStepSave({
          profileBlurb: profileBlurb.trim(),
          linkedinUrl: linkedinUrl.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          additionalUrls,
          onboardingStep: 3,
        });
      }

      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
      return;
    }

    setTemplateError(null);
    await onSubmit({
      outreachIntents: selectedIntents,
      profileBlurb: profileBlurb.trim(),
      linkedinUrl: linkedinUrl.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      additionalUrls,
      templateDraft: {
        name: templateName.trim(),
        subject: templateSubject.trim(),
        body: templateBody.trim(),
        footer: serializeFooter(templateFooter),
        attachments: serializeAttachments(templateAttachments),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden animate-slide-up-fade">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-white/50">onboarding</p>
          <p className="text-xs text-white/60">
            {step.title} of {STEPS.length}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white tracking-tight">{step.prompt}</h2>
            {step.id === "outreach_intents" ? (
              <p className="text-sm text-white/60">
                Pick one or more. This helps tailor who we find and how we guide outreach.
              </p>
            ) : step.id === "profile" ? (
              <p className="text-sm text-white/60">
                Add context and links so outreach can be more relevant.
              </p>
            ) : (
              <p className="text-sm text-white/60">
                We generate this from your onboarding data, then you can edit everything before finishing.
              </p>
            )}
          </div>

          {step.id === "outreach_intents" ? (
            <>
              <div className="flex flex-wrap gap-2.5">
                {INTENT_OPTIONS.map((intent) => {
                  const active = selectedIntents.some(
                    (value) => value.toLowerCase() === intent.toLowerCase(),
                  );
                  return (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => toggleIntent(intent)}
                      className={`rounded-full border px-3 py-1.5 text-sm lowercase transition-colors ${
                        active
                          ? "border-white bg-white text-black"
                          : "border-white/20 text-white/80 hover:border-white/40 hover:text-white"
                      }`}
                    >
                      {intent}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-white/50">
                  Add custom intent
                </label>
                <div className="flex gap-2">
                  <input
                    value={customIntent}
                    onChange={(event) => setCustomIntent(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomIntent();
                      }
                    }}
                    placeholder="e.g. investor outreach"
                    className="h-10 flex-1 rounded-lg border border-white/15 bg-black px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
                  />
                  <button
                    type="button"
                    onClick={addCustomIntent}
                    className="h-10 rounded-lg border border-white/20 px-4 text-sm text-white hover:border-white/40"
                  >
                    Add
                  </button>
                </div>
              </div>

              {selectedIntents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedIntents.map((intent) => (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => toggleIntent(intent)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:border-white/35"
                    >
                      {intent}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : step.id === "profile" ? (
            <div className="space-y-4">
              <textarea
                value={profileBlurb}
                onChange={(event) => setProfileBlurb(event.target.value)}
                placeholder="Quick intro about what you do, your focus, or your goals."
                className="min-h-[110px] w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                  placeholder="LinkedIn URL"
                  className="h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
                />
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="Website URL"
                  className="h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-white/50">
                  Other URLs
                </label>
                <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                  <input
                    value={customUrlLabel}
                    onChange={(event) => setCustomUrlLabel(event.target.value)}
                    placeholder="Label (e.g. Twitter)"
                    className="h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
                  />
                  <input
                    value={customUrlValue}
                    onChange={(event) => setCustomUrlValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomUrl();
                      }
                    }}
                    placeholder="https://..."
                    className="h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
                  />
                  <button
                    type="button"
                    onClick={addCustomUrl}
                    className="h-10 rounded-lg border border-white/20 px-4 text-sm text-white hover:border-white/40"
                  >
                    Add
                  </button>
                </div>
              </div>

              {additionalUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalUrls.map((entry) => (
                    <button
                      key={`${entry.label}-${entry.url}`}
                      type="button"
                      onClick={() =>
                        setAdditionalUrls((prev) =>
                          prev.filter(
                            (item) =>
                              !(
                                item.label.toLowerCase() === entry.label.toLowerCase() &&
                                item.url.toLowerCase() === entry.url.toLowerCase()
                              ),
                          ),
                        )
                      }
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:border-white/35"
                    >
                      {entry.label}: {entry.url}
                    </button>
                  ))}
                </div>
              )}
              {urlError && <p className="text-xs text-red-300">{urlError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {isGeneratingTemplate && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                  Generating template draft...
                </div>
              )}

              {templateError && <p className="text-xs text-red-300">{templateError}</p>}

              <div className="rounded-xl border border-[#2a2a2a] overflow-hidden">
                <Input
                  required
                  placeholder="Template name..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="h-10 border-0 border-b border-[#1a1a1a] bg-[#151515] text-sm text-[#e8e8e8] focus-visible:ring-0 rounded-none"
                />

                <div className="flex min-h-[420px]">
                  <div className="flex-1 min-w-0 flex flex-col border-r border-[#2a2a2a]">
                    <Input
                      required
                      placeholder="Subject line..."
                      value={templateSubject}
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      className="border-0 border-b border-[#1a1a1a] bg-transparent text-[#e8e8e8] focus-visible:ring-0 px-4 py-3 h-auto text-sm font-medium placeholder:text-[#4a4a4a] rounded-none"
                    />
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                      <RichTextEditor
                        value={templateBody}
                        onChange={(html) => setTemplateBody(html)}
                        placeholder="Write your email body here..."
                      />
                      {(templateFooter.text ||
                        templateFooter.links.some((link) => link.label && link.url)) && (
                        <div className="text-sm leading-relaxed">
                          {templateFooter.text && (
                            <div className="text-[#8a8a8a]">{templateFooter.text}</div>
                          )}
                          {templateFooter.links.filter((link) => link.label && link.url).length >
                            0 && (
                            <div>
                              {templateFooter.links
                                .filter((link) => link.label && link.url)
                                .map((link, index) => (
                                  <span key={index}>
                                    {index > 0 && (
                                      <span className="text-[#4a4a4a]"> | </span>
                                    )}
                                    <span className="text-blue-400">{link.label}</span>
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-[300px] shrink-0 overflow-y-auto p-4 pb-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-[#6a6a6a]" />
                      <span className="text-[10px] font-medium text-[#6a6a6a] uppercase tracking-wider">
                        Footer
                      </span>
                    </div>

                    <Input
                      placeholder="e.g. Best regards, {firstName}"
                      value={templateFooter.text}
                      onChange={(e) =>
                        setTemplateFooter((prev) => ({ ...prev, text: e.target.value }))
                      }
                      className="h-8 text-xs bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] focus:border-[#4a4a4a] focus:ring-0 placeholder:text-[#4a4a4a]"
                    />

                    <div className="space-y-4">
                      {templateFooter.links.map((link, index) => (
                        <div key={index} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Input
                              placeholder="Link text"
                              value={link.label}
                              onChange={(e) => updateFooterLink(index, "label", e.target.value)}
                              className="flex-1 h-7 text-[11px] bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] focus:border-[#4a4a4a] focus:ring-0 placeholder:text-[#4a4a4a]"
                            />
                            <button
                              type="button"
                              onClick={() => removeFooterLink(index)}
                              className="p-1 text-[#6a6a6a] hover:text-red-400 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <Input
                            placeholder="https://..."
                            value={link.url}
                            onChange={(e) => updateFooterLink(index, "url", e.target.value)}
                            className="h-7 text-[11px] bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] focus:border-[#4a4a4a] focus:ring-0 placeholder:text-[#4a4a4a]"
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addFooterLink}
                      className="h-6 px-2 text-[11px] text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add link
                    </Button>

                    <div className="pt-2 border-t border-[#1a1a1a] space-y-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3 h-3 text-[#6a6a6a]" />
                        <span className="text-[10px] font-medium text-[#6a6a6a] uppercase tracking-wider">
                          Attachments
                        </span>
                      </div>

                      <div className="space-y-1">
                        {templateAttachments.map((att, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-[#151515] border border-[#2a2a2a] rounded px-2 py-1 text-[10px] text-[#c0c0c0]"
                          >
                            <Paperclip className="w-2.5 h-2.5 text-[#6a6a6a] shrink-0" />
                            <span className="truncate flex-1">{att.filename}</span>
                            <span className="text-[#5a5a5a] shrink-0">{formatFileSize(att.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-[#5a5a5a] hover:text-red-400 transition-colors shrink-0"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-6 w-full text-[10px] text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a] border border-dashed border-[#2a2a2a]"
                      >
                        <Plus className="w-2.5 h-2.5 mr-1" />
                        Add file
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
            disabled={stepIndex === 0 || isSaving || isGeneratingTemplate}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canContinue}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : isLastStep ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseAttachments(raw: string | null | undefined): TemplateAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeAttachments(attachments: TemplateAttachment[]): string | null {
  if (attachments.length === 0) return null;
  return JSON.stringify(attachments);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
