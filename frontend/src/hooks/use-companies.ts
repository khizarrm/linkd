import useSWR, { mutate } from 'swr';
import { protectedApi } from '@/lib/api';

const COMPANIES_KEY = 'companies';

export function useCompanies() {
  const { data, error, isLoading } = useSWR(COMPANIES_KEY, async () => {
    const response = await protectedApi.listCompanies();
    if (!response.success) throw new Error('Failed to load companies');
    return response.companies;
  }, {
    revalidateOnFocus: false, // Only fetch on mount/mutation, not every time you click the window
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // Cache for at least 1 minute
  });

  return {
    companies: data || [],
    isLoading,
    isError: error,
    // Helper to manually trigger a refresh (e.g. after create/delete)
    mutateCompanies: () => mutate(COMPANIES_KEY)
  };
}

