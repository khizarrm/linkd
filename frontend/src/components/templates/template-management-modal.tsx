'use client';

import { useState } from 'react';
import { useTemplates } from '@/hooks/use-templates';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { TemplateEditorModal } from './template-editor-modal';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (deletingId === id) {
      // Confirm delete
      try {
        await protectedApi.deleteTemplate(id);
        mutateTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
      } finally {
        setDeletingId(null);
      }
    } else {
      // Show confirmation
      setDeletingId(id);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-[#0a0a0a] border-[#2a2a2a] text-[#e8e8e8] p-0 gap-0">
          <DialogHeader className="p-6 border-b border-[#2a2a2a]">
            <DialogTitle className="text-xl font-medium tracking-tight">Templates</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[#8a8a8a]">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading...
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <p className="text-sm text-[#8a8a8a]">No templates yet</p>
                <Button
                  onClick={handleCreate}
                  className="bg-[#e8e8e8] text-black hover:bg-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Create New Card */}
                <button
                  onClick={handleCreate}
                  className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed border-[#2a2a2a] rounded-xl hover:border-[#4a4a4a] hover:bg-[#151515] transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-3 group-hover:bg-[#252525] transition-colors">
                    <Plus className="w-6 h-6 text-[#8a8a8a] group-hover:text-[#e8e8e8]" />
                  </div>
                  <span className="text-sm font-medium text-[#8a8a8a] group-hover:text-[#e8e8e8]">New template</span>
                </button>

                {/* Template Cards */}
                {templates.map((template: Template) => (
                  <Card
                    key={template.id}
                    onClick={() => handleEdit(template)}
                    role="button"
                    className="bg-[#151515] border-[#2a2a2a] h-[200px] flex flex-col hover:border-[#3a3a3a] transition-colors group relative overflow-hidden cursor-pointer"
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-medium text-[#e8e8e8] truncate">
                        {template.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 flex-1 overflow-hidden">
                      <p className="text-xs text-[#8a8a8a] font-medium mb-1 truncate">
                        {template.subject}
                      </p>
                      <p className="text-xs text-[#6a6a6a] line-clamp-4 leading-relaxed">
                        {template.body}
                      </p>
                    </CardContent>
                    <div className="p-3 border-t border-[#2a2a2a] bg-[#1a1a1a] flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        className="h-8 px-2 text-[#8a8a8a] hover:text-[#e8e8e8] hover:bg-[#252525]"
                      >
                        <Edit2 className="w-4 h-4 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(template.id, e)}
                        className={`h-8 px-2 ${
                          deletingId === template.id
                            ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                            : 'text-[#8a8a8a] hover:text-red-400 hover:bg-[#252525]'
                        }`}
                      >
                        {deletingId === template.id ? (
                          <>
                            <AlertCircle className="w-4 h-4 mr-1.5" />
                            Confirm
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
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
