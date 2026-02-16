"use client";

import { Mail, Copy, Check } from "lucide-react";
import { useState } from "react";

export interface EmailData {
  id: string;
  name: string;
  email: string;
  domain: string;
  verificationStatus: "verified" | "possible";
}

interface EmailComposeCardProps {
  email: EmailData;
  onCompose: (email: EmailData) => void;
}

export function EmailComposeCard({ email, onCompose }: EmailComposeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isVerified = email.verificationStatus === "verified";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-950/30 ring-1 ring-emerald-800/50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {email.name}
        </p>
        <p className="text-xs text-emerald-400 truncate">
          {email.email}
          <span className="ml-1.5 text-emerald-600">
            {isVerified ? "verified" : "possible"}
          </span>
        </p>
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
          onClick={() => onCompose(email)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-2 text-xs font-medium text-white"
        >
          <Mail className="h-3.5 w-3.5" />
          Compose
        </button>
      </div>
    </div>
  );
}
