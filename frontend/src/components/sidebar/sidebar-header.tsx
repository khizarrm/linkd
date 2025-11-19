'use client';

interface SidebarHeaderProps {
  title: string;
  subtitle: string;
}

export function SidebarHeader({ title, subtitle }: SidebarHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-light tracking-tight text-[#e8e8e8] mb-1">
        {title}
      </h2>
      <p className="text-xs font-light text-[#6a6a6a] uppercase tracking-widest">
        {subtitle}
      </p>
    </div>
  );
}
