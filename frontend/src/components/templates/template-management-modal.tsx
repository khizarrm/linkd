'use client';

import { useState } from 'react';
import { useTemplates } from '@/hooks/use-templates';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Loader2, Edit2 } from 'lucide-react';
import { TemplateEditorModal } from './template-editor-modal';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  footer?: string | null;
  attachments?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TemplateManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateManagementModal({ open, onOpenChange }: TemplateManagementModalProps) {
  const { templates, isLoading, mutateTemplates } = useTemplates();
  const protectedApi = useProtectedApi();
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const handleCreate = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await protectedApi.deleteTemplate(id);
      mutateTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8] p-0 gap-0">
          <DialogHeader className="px-6 pr-14 py-4 border-b border-[#2a2a2a] flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-medium tracking-tight">Templates</DialogTitle>
            <Button
              onClick={handleCreate}
              size="sm"
              className="bg-[#e8e8e8] text-black hover:bg-white h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New template
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[#8a8a8a]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <p className="text-sm text-[#6a6a6a]">No templates yet</p>
                <Button
                  onClick={handleCreate}
                  className="bg-[#e8e8e8] text-black hover:bg-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first template
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {templates.map((template: Template) => (
                  <button
                    key={template.id}
                    onClick={() => handleEdit(template)}
                    className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:bg-[#111111] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#e8e8e8] truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-[#6a6a6a] truncate mt-0.5">
                        {template.subject || 'No subject'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleEdit(template); } }}
                        className="p-1.5 rounded-md text-[#6a6a6a] hover:text-[#e8e8e8] hover:bg-[#252525] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(template.id, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(template.id, e as unknown as React.MouseEvent); }}
                        className="p-1.5 rounded-md text-[#6a6a6a] hover:text-red-400 hover:bg-[#252525] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TemplateEditorModal
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSuccess={() => {
          mutateTemplates();
          setIsEditorOpen(false);
        }}
        initialData={editingTemplate}
      />
    </>
  );
}
