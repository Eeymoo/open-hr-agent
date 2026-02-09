import { useQuery } from '@tanstack/react-query';
import { getIssues } from '../api/issues';
import { POLLING_INTERVAL } from '../utils/constants';
import type { PaginationParams } from '../types/issue';

export function useIssues(params?: PaginationParams) {
  return useQuery({
    queryKey: ['issues', params],
    queryFn: async () => {
      const response = await getIssues(params);
      return response.data.data;
    },
    refetchInterval: POLLING_INTERVAL
  });
}
