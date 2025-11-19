'use client';

import { ReactNode } from 'react';

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      {title && (
        <h3 className="text-xs font-light text-[#4a4a4a] uppercase tracking-widest mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
