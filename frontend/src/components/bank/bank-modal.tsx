'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BankContent } from './bank-content';

interface BankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * BankModal - Large modal wrapper for bank interface
 *
 * Displays company search and grid in a prominent modal.
 * Size: 90% viewport width, 85% viewport height
 * Uses shadcn Dialog component with dark theme styling matching FAQ modal.
 */
export function BankModal({ open, onOpenChange }: BankModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[85vh] flex flex-col p-0 bg-black border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle
              className="text-2xl md:text-3xl font-medium text-white lowercase"
              style={{ fontFamily: 'var(--font-fira-mono)' }}
            >
              bank
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content - takes remaining space, scrolling handled inside BankContent */}
        <div className="flex-1 overflow-hidden min-h-0">
          <BankContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
