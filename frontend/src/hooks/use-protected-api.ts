'use client';

import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';
import type { OrchestratorResponse } from '@/lib/api';

export function useProtectedApi() {
  const { getToken, userId } = useAuth();

  return {
    // User profile
    getCurrentUser: async () => {
      const token = await getToken();
      const response = await apiFetch("/api/protected/users/me", {
        method: "GET",
      }, token);
      if (!response.ok) throw new Error("Failed to fetch current user");
      return response.json() as Promise<{
        success: boolean;
        user: {
          clerkUserId: string;
          email: string;
          name: string | null;
          image: string | null;
          onboardingContext: string | null;
          onboardingCompleted: boolean;
          onboardingCompletedAt: number | null;
        };
      }>;
    },

    updateCurrentUser: async (data: {
      onboardingContext?: string | null;
      onboardingCompleted?: boolean;
    }) => {
      const token = await getToken();
      const response = await apiFetch("/api/protected/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) throw new Error("Failed to update current user");
      return response.json() as Promise<{
        success: boolean;
        user: {
          clerkUserId: string;
          email: string;
          name: string | null;
          image: string | null;
          onboardingContext: string | null;
          onboardingCompleted: boolean;
          onboardingCompletedAt: number | null;
        };
      }>;
    },

    // Templates
    listTemplates: async () => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/templates', {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to list templates');
      return response.json();
    },

    createTemplate: async (data: { name: string; subject: string; body: string; attachments?: string | null }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },

    updateTemplate: async (id: string, data: { name?: string; subject?: string; body?: string; attachments?: string | null }) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },

    deleteTemplate: async (id: string) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/templates/${id}`, {
        method: 'DELETE',
      }, token);
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },

    setDefaultTemplate: async (id: string) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/templates/${id}/default`, {
        method: 'PUT',
      }, token);
      if (!response.ok) throw new Error('Failed to set default template');
      return response.json();
    },

    generateTemplateFromOnboarding: async (data: {
      outreachIntents: string[];
      profileBlurb: string;
      linkedinUrl: string | null;
      websiteUrl: string | null;
      additionalUrls: Array<{ label: string; url: string }>;
    }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/templates/generate-from-onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate template draft' }));
        throw new Error(error.message || error.error || 'Failed to generate template draft');
      }
      return response.json() as Promise<{
        success: boolean;
        templateDraft: {
          name: string;
          subject: string;
          body: string;
          attachments: string | null;
        };
      }>;
    },

    processTemplate: async (data: { 
      templateId: string; 
      person: { name: string; role?: string; email?: string }; 
      company: string 
    }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/templates/process', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to process template' }));
        throw new Error(error.message || error.error || 'Failed to process template');
      }
      const result = await response.json();
      return {
        subject: result.subject,
        body: result.body,
        attachments: result.attachments as string | null,
      };
    },

    // Companies
    listCompanies: async () => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/companies', {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to list companies');
      return response.json();
    },

    getCompanyEmployees: async (companyId: number) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/companies/${companyId}/employees`, {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to get company employees');
      return response.json();
    },

    // Google OAuth
    getGoogleAuthUrl: async () => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/auth/google', {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to get Google auth URL');
      return response.json() as Promise<{ url: string }>;
    },

    getGmailStatus: async () => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/auth/google/status', {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to check Gmail status');
      return response.json() as Promise<{ connected: boolean }>;
    },

    // Email
    sendEmail: async (data: {
      to: string;
      subject: string;
      body: string;
      attachments?: Array<{ filename: string; mimeType: string; data: string }>;
    }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/email/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to send email' }));
        throw new Error(error.message || error.error || 'Failed to send email');
      }
      return response.json();
    },

    sendBulkEmail: async (data: {
      items: Array<{
        clientId: string;
        to: string;
        subject: string;
        body: string;
        attachments?: Array<{ filename: string; mimeType: string; data: string }>;
      }>;
    }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/email/send-bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to send bulk email' }));
        throw new Error(error.message || error.error || 'Failed to send bulk email');
      }
      return response.json() as Promise<{
        success: boolean;
        summary: { total: number; sent: number; failed: number };
        results: Array<{
          clientId: string;
          to: string;
          success: boolean;
          attempts: number;
          messageId?: string;
          error?: string;
          statusCode?: number;
        }>;
      }>;
    },

    // Agents
    orchestrator: async (params: { query: string }): Promise<OrchestratorResponse> => {
      const token = await getToken();
      const response = await apiFetch('/api/agents/orchestrator', {
        method: 'POST',
        body: JSON.stringify(params),
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An unexpected error occurred' }));
        throw new Error(error.error || 'Failed to run orchestrator');
      }
      return response.json();
    },

    // Chats
    listChats: async () => {
      const token = await getToken();
      console.log('[listChats] token present:', !!token, 'length:', token?.length ?? 0);
      const response = await apiFetch('/api/protected/chats', {
        method: 'GET',
      }, token);
      if (!response.ok) {
        const body = await response.text();
        console.error('[listChats] failed', response.status, body);
        throw new Error(`Failed to list chats: ${response.status} ${body}`);
      }
      return response.json();
    },

    createChat: async (data?: { title?: string }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/chats', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }, token);
      if (!response.ok) throw new Error('Failed to create chat');
      return response.json();
    },

    getChat: async (id: string) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/chats/${id}`, {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to get chat');
      return response.json();
    },

    updateChat: async (id: string, data: { title?: string; claudeConversationId?: string }) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/chats/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) throw new Error('Failed to update chat');
      return response.json();
    },

    deleteChat: async (id: string) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/chats/${id}`, {
        method: 'DELETE',
      }, token);
      if (!response.ok) throw new Error('Failed to delete chat');
      return response.json();
    },

    addMessage: async (chatId: string, data: { role: 'user' | 'assistant'; content: string }) => {
      const token = await getToken();
      const response = await apiFetch(`/api/protected/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) throw new Error('Failed to add message');
      return response.json();
    },
  };
}
