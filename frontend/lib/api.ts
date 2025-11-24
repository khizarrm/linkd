import { authClient } from './auth-client';
import { getCachedProfile, setCachedProfile, updateCachedProfile, clearProfileCache } from './profile-cache';

// Types
export interface OrchestratorPerson {
  name: string;
  role: string;
  emails?: string[];
}

export interface OrchestratorResponse {
  company: string;
  website: string;
  people: OrchestratorPerson[];
  message?: string;
  favicon?: string;
}

// Helper function for authenticated API calls
async function apiFetch(url: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const sessionResult = await authClient.getSession();
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  // Handle different return types from getSession
  try {
    const session = (sessionResult as any)?.data?.session || (sessionResult as any)?.session;
    if (session?.token && typeof session.token === 'string') {
      headers.set('Cookie', `better-auth.session_token=${session.token}`);
    }
  } catch {
    // If session access fails, continue without auth header
  }

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response;
}

// Agents API
export const agentsApi = {
  orchestrator: async (params: { query: string }): Promise<OrchestratorResponse> => {
    const response = await apiFetch('/api/agents/orchestrator', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to run orchestrator');
    return response.json();
  },
};

// Public API (no authentication required)
export const publicApi = {
  joinWaitlist: async (data: { email: string; name?: string }) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/public/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to join waitlist' }));
      throw new Error(error.message || error.error || 'Failed to join waitlist');
    }
    return response.json();
  },
};

// Protected API (requires authentication)
export const protectedApi = {
  // Templates
  listTemplates: async () => {
    const response = await apiFetch('/api/protected/templates', {
      method: 'GET',
    });
    if (!response.ok) throw new Error('Failed to list templates');
    return response.json();
  },

  createTemplate: async (data: { name: string; subject: string; body: string }) => {
    const response = await apiFetch('/api/protected/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
  },

  updateTemplate: async (id: string, data: { name?: string; subject?: string; body?: string }) => {
    const response = await apiFetch(`/api/protected/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update template');
    return response.json();
  },

  deleteTemplate: async (id: string) => {
    const response = await apiFetch(`/api/protected/templates/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete template');
    return response.json();
  },

  processTemplate: async (data: { 
    templateId: string; 
    person: { name: string; role?: string; email?: string }; 
    company: string 
  }) => {
    const response = await apiFetch('/api/protected/templates/process', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to process template' }));
      throw new Error(error.message || error.error || 'Failed to process template');
    }
    const result = await response.json();
    return { subject: result.subject, body: result.body };
  },

  // Companies
  listCompanies: async () => {
    const response = await apiFetch('/api/protected/companies', {
      method: 'GET',
    });
    if (!response.ok) throw new Error('Failed to list companies');
    return response.json();
  },

  getCompanyEmployees: async (companyId: number) => {
    const response = await apiFetch(`/api/protected/companies/${companyId}/employees`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error('Failed to get company employees');
    return response.json();
  },

  // Email
  sendEmail: async (data: { to: string; subject: string; body: string }) => {
    const response = await apiFetch('/api/protected/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    const response = await apiFetch('/api/protected/profile', {
      method: 'GET',
    });
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
    const response = await apiFetch('/api/protected/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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
};
