import { useQuery } from '@tanstack/react-query';
import { getConfig } from '../api/config';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await getConfig();
      return response.data.data;
    },
    staleTime: Infinity
  });
}
