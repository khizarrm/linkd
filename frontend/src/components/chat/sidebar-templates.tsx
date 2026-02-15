'use client';

import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { useTemplates } from '@/hooks/use-templates';
import { TemplateDialog } from '@/components/templates/create-template-dialog';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

export function SidebarTemplates() {
  const { templates, isLoading, mutateTemplates } = useTemplates();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleCreateSuccess = () => {
    mutateTemplates();
    setIsCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    mutateTemplates();
    setEditingTemplate(null);
  };

  const handleTemplateClick = (template: Template) => {
    setEditingTemplate(template);
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Templates</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-xs text-muted-foreground">Loading...</div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Templates</SidebarGroupLabel>
        <SidebarGroupAction title="Create template" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus /> <span className="sr-only">Create template</span>
        </SidebarGroupAction>
        <SidebarGroupContent>
          {templates.length === 0 ? (
            <div className="px-2 py-4 text-xs text-muted-foreground">No templates yet</div>
          ) : (
            <SidebarMenu>
              {templates.map((template: Template) => (
                <SidebarMenuItem key={template.id}>
                  <SidebarMenuButton
                    onClick={() => handleTemplateClick(template)}
                    tooltip={template.name}
                  >
                    <FileText className="size-4" />
                    <span className="truncate">{template.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <TemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <TemplateDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        onSuccess={handleEditSuccess}
        initialData={editingTemplate}
      />
    </>
  );
}
