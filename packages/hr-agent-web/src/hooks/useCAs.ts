import { useQuery } from '@tanstack/react-query';
import { getCAs } from '../api/ca';
import { POLLING_INTERVAL } from '../utils/constants';

export function useCAs() {
  return useQuery({
    queryKey: ['cas'],
    queryFn: async () => {
      const response = await getCAs();
      return response.data.data;
    },
    refetchInterval: POLLING_INTERVAL
  });
}
