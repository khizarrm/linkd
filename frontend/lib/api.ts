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

// Helper function for API calls with Clerk authentication
export async function apiFetch(url: string, options: RequestInit = {}, token?: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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
  orchestrator: async (params: { query: string }, token?: string | null): Promise<OrchestratorResponse> => {
    const response = await apiFetch('/api/agents/orchestrator', {
      method: 'POST',
      body: JSON.stringify(params),
    }, token);
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

};
