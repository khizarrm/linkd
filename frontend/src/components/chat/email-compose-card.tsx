"use client";

import { Mail, Copy, Check, Square, CheckSquare } from "lucide-react";
import { useState } from "react";

export interface ProcessedEmailContent {
  templateId: string;
  subject: string;
  body: string;
  attachments: string | null;
}

export interface EmailData {
  id: string;
  uiId?: string;
  name: string;
  email: string;
  domain: string;
  verificationStatus: "verified" | "possible";
  processedEmail?: ProcessedEmailContent | null;
}

interface EmailComposeCardProps {
  email: EmailData;
  onCompose: (email: EmailData) => void;
  isSelected: boolean;
  onToggleSelect: (email: EmailData) => void;
  isSent: boolean;
}

export function EmailComposeCard({
  email,
  onCompose,
  isSelected,
  onToggleSelect,
  isSent,
}: EmailComposeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isVerified = email.verificationStatus === "verified";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-950/30 ring-1 ring-emerald-800/50 px-4 py-3">
      <div className="min-w-0 flex items-center gap-3">
        <button
          onClick={() => onToggleSelect(email)}
          disabled={isSent}
          className="flex items-center justify-center text-emerald-300 hover:text-emerald-100 disabled:opacity-70 disabled:cursor-not-allowed"
          aria-label={isSelected ? "Deselect email" : "Select email"}
        >
          {isSent ? (
            <CheckSquare className="h-4 w-4" />
          ) : isSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <div>
          <p className="text-sm font-medium text-foreground truncate">
            {email.name}
          </p>
          <p className="text-xs text-emerald-400 truncate">
            {email.email}
            <span className="ml-1.5 text-emerald-600">
              {isSent ? "sent" : isVerified ? "verified" : "possible"}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center rounded-lg bg-card hover:bg-muted ring-1 ring-border transition-colors p-2 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          disabled={isSent}
          onClick={() => onCompose(email)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-emerald-700 disabled:hover:bg-emerald-700 transition-colors px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed"
        >
          <Mail className="h-3.5 w-3.5" />
          {isSent ? "Sent" : "Compose"}
        </button>
      </div>
    </div>
  );
}
