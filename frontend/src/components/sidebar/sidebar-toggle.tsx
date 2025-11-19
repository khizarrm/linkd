'use client';

import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface SidebarToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function SidebarToggle({ isOpen, onClick }: SidebarToggleProps) {
  return (
    <button
      onClick={onClick}
      className="fixed top-6 left-6 z-50 p-3 bg-[#151515] border border-[#2a2a2a] rounded-xl hover:border-[#3a3a3a] hover:bg-[#1a1a1a] active:scale-95 transition-all duration-300 group"
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      {isOpen ? (
        <PanelLeftClose className="h-5 w-5 text-[#e8e8e8] group-hover:text-white transition-colors" />
      ) : (
        <PanelLeft className="h-5 w-5 text-[#e8e8e8] group-hover:text-white transition-colors" />
      )}
    </button>
  );
}
