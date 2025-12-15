import useSWR, { mutate } from 'swr';
import { useProtectedApi } from './use-protected-api';

const TEMPLATES_KEY = 'templates';

export function useTemplates() {
  const protectedApi = useProtectedApi();
  const { data, error, isLoading } = useSWR(TEMPLATES_KEY, async () => {
    const response = await protectedApi.listTemplates();
    if (!response.success) throw new Error('Failed to load templates');
    return response.templates;
  }, {
    revalidateOnFocus: false, // Only fetch on mount/mutation, not every time you click the window
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // Cache for at least 1 minute
  });

  return {
    templates: data || [],
    isLoading,
    isError: error,
    // Helper to manually trigger a refresh (e.g. after create/delete)
    mutateTemplates: () => mutate(TEMPLATES_KEY)
  };
}

