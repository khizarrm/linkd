'use client';

import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';
import { getCachedProfile, setCachedProfile } from '@/lib/profile-cache';
import type { OrchestratorResponse } from '@/lib/api';

export function useProtectedApi() {
  const { getToken } = useAuth();

  return {
    // Templates
    listTemplates: async () => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/templates', {
        method: 'GET',
      }, token);
      if (!response.ok) throw new Error('Failed to list templates');
      return response.json();
    },

    createTemplate: async (data: { name: string; subject: string; body: string }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },

    updateTemplate: async (id: string, data: { name?: string; subject?: string; body?: string }) => {
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
      return { subject: result.subject, body: result.body };
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

    // Email
    sendEmail: async (data: { to: string; subject: string; body: string }) => {
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

    // Profile
    getProfile: async (forceRefresh = false) => {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cached = getCachedProfile();
        if (cached) {
          return {
            success: true,
            user: cached,
            session: {
              id: '',
              expiresAt: '',
            },
          };
        }
      }

      // Fetch from API
      const token = await getToken();
      const response = await apiFetch('/api/protected/profile', {
        method: 'GET',
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to get profile' }));
        throw new Error(error.message || error.error || 'Failed to get profile');
      }
      
      const data = await response.json();
      
      // Cache the profile data
      if (data.success && data.user) {
        setCachedProfile(data.user);
      }
      
      return data;
    },

    updateProfile: async (data: {
      name?: string;
      linkedinUrl?: string;
      githubUrl?: string;
      websiteUrl?: string;
      twitterUrl?: string;
    }) => {
      const token = await getToken();
      const response = await apiFetch('/api/protected/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, token);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
        throw new Error(error.message || error.error || 'Failed to update profile');
      }
      
      const result = await response.json();
      
      // Update cache with new data
      if (result.success && result.user) {
        setCachedProfile(result.user);
      }
      
      return result;
    },

    // Agents
    orchestrator: async (params: { query: string }): Promise<OrchestratorResponse> => {
      const token = await getToken();
      const response = await apiFetch('/api/agents/orchestrator', {
        method: 'POST',
        body: JSON.stringify(params),
      }, token);
      if (!response.ok) throw new Error('Failed to run orchestrator');
      return response.json();
    },
  };
}

