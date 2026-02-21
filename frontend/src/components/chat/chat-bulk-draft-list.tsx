"use client";

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import type { RecipientDraft } from "./chat-bulk-compose-utils";

interface ChatBulkDraftListProps {
  drafts: RecipientDraft[];
  selectedDraftId: string | null;
  onSelectDraft: (clientId: string) => void;
}

export function ChatBulkDraftList({
  drafts,
  selectedDraftId,
  onSelectDraft,
}: ChatBulkDraftListProps) {
  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
      <div className="max-h-[520px] overflow-y-auto divide-y divide-[#2a2a2a]">
        {drafts.map((draft) => (
          <div
            key={draft.clientId}
            className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
              selectedDraftId === draft.clientId
                ? "bg-[#181818]"
                : "bg-[#111111] hover:bg-[#151515]"
            }`}
            onClick={() => onSelectDraft(draft.clientId)}
          >
            <div className="min-w-0">
              <p className="text-sm text-[#e8e8e8] truncate">{draft.name}</p>
              <p className="text-xs text-[#8a8a8a] truncate">{draft.email}</p>
              {draft.subject && (
                <p className="text-xs text-[#6a6a6a] truncate mt-1">{draft.subject}</p>
              )}
              {draft.error && (
                <p className="text-xs text-red-400 mt-1">{draft.error}</p>
              )}
            </div>
            <div className="shrink-0 text-xs">
              {draft.status === "processing" ? (
                <span className="flex items-center gap-1 text-[#8a8a8a]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating
                </span>
              ) : draft.status === "ready" ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Failed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
