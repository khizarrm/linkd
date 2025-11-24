'use client';

import { TemplateList } from '@/components/templates/template-list';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default function TemplatesPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        <h1 className="text-lg font-semibold">Templates</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <TemplateList />
      </div>
    </>
  );
}
