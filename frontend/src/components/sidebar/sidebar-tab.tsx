'use client';

import { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface SidebarTabProps {
  id: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarTab({ label, icon: Icon, isActive, onClick }: SidebarTabProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-4 py-3.5 rounded-lg
        transition-all duration-300 group
        ${isActive
          ? 'bg-white text-[#0a0a0a]'
          : 'bg-transparent text-[#6a6a6a] hover:bg-[#151515] hover:text-[#e8e8e8]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="text-sm font-light tracking-wide">
          {label}
        </span>
      </div>
      <ChevronRight className={`h-3.5 w-3.5 transition-all duration-300 ${
        isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0'
      }`} />
    </button>
  );
}
