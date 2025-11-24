'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateDialog } from './create-template-dialog';
import { protectedApi } from '@/lib/api';
import { useTemplates } from '@/hooks/use-templates';

export function TemplateList() {
  const { templates, isLoading, mutateTemplates } = useTemplates();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await protectedApi.deleteTemplate(id);
      mutateTemplates(); // Instantly triggers a re-fetch to update the list
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-[200px]" />)}</div>;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* New Template Card */}
        <article
          className="bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-4 sm:p-5 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 cursor-pointer border-dashed flex flex-col items-center justify-center min-h-[160px] group"
          onClick={handleCreate}
        >
          <div className="flex flex-col items-center gap-2 text-[#6a6a6a] group-hover:text-[#e8e8e8] transition-colors">
            <div className="h-10 w-10 rounded-full bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-center group-hover:bg-[#1a1a1a] group-hover:border-[#3a3a3a] transition-all">
              <Plus className="h-5 w-5" />
            </div>
            <span className="font-sans font-light tracking-wide text-sm">Create New Template</span>
          </div>
        </article>

        {/* Existing Templates */}
        {templates.map((t: any, index: number) => (
          <article
            key={t.id}
            className="bg-[#151515] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 hover:border-[#3a3a3a] active:scale-[0.98] transition-all duration-300 flex flex-col h-full group cursor-pointer relative"
            onClick={() => handleEdit(t)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex flex-col gap-4 flex-grow">
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 className="text-xl sm:text-2xl font-light tracking-tight break-words text-[#e8e8e8]">
                    {t.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans font-light text-[#6a6a6a] line-clamp-1">
                    Subject: {t.subject}
                  </p>
                </div>
                <div onClick={e => e.stopPropagation()} className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#151515] border-[#2a2a2a]">
                      <DropdownMenuItem 
                        onClick={() => handleEdit(t)}
                        className="text-[#e8e8e8] hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]"
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]" 
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Body */}
              <div className="flex-grow">
                <p className="text-sm font-sans font-light text-[#6a6a6a] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {t.body}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <TemplateDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        initialData={editingTemplate}
        onSuccess={mutateTemplates} /* Simply call mutate on success */
      />
    </>
  );
}
