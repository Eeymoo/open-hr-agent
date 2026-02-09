import { useQuery } from '@tanstack/react-query';
import { getPRs } from '../api/prs';
import { POLLING_INTERVAL } from '../utils/constants';
import type { PaginationParams } from '../types/issue';

export function usePRs(params?: PaginationParams) {
  return useQuery({
    queryKey: ['prs', params],
    queryFn: async () => {
      const response = await getPRs(params);
      return response.data.data;
    },
    refetchInterval: POLLING_INTERVAL
  });
}
