'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProtectedApi } from '@/hooks/use-protected-api';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const protectedApi = useProtectedApi();

  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    protectedApi.getCurrentUser()
      .then((data) => setValue(data.user.onboardingContext ?? ''))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await protectedApi.updateCurrentUser({ onboardingContext: value.trim() || null });
      onOpenChange(false);
    } catch {
      // silent — keep modal open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8]">
        <DialogHeader className="px-6 py-4 border-b border-[#2a2a2a]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#6a6a6a]">Profile</p>
          <DialogTitle className="text-xl font-semibold tracking-tight mt-1">
            Tell the agent about yourself
          </DialogTitle>
          <p className="text-sm text-[#8a8a8a] mt-1">
            Add context about your goals, background, and what good research should focus on.
          </p>
        </DialogHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px] text-[#6a6a6a]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="I'm a CS student looking for backend internships in SF startups. Focus on teams hiring interns and prioritize companies where I can ship production code quickly..."
              className="min-h-[200px] w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#4a4a4a] focus:outline-none focus:border-[#4a4a4a] resize-none"
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-xs text-[#6a6a6a] hover:text-[#e8e8e8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#e8e8e8] text-black hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
