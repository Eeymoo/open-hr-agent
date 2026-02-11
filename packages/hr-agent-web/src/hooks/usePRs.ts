import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPRs, getPR, createPR } from '../api/prs';
import type { PaginationParams } from '../types/issue';

export function usePRs(params?: PaginationParams) {
  return useQuery({
    queryKey: ['prs', params],
    queryFn: async () => {
      const response = await getPRs(params);
      return response.data.data;
    }
  });
}

export function usePR(id: number) {
  return useQuery({
    queryKey: ['pr', id],
    queryFn: async () => {
      const response = await getPR(id);
      return response.data.data;
    },
    enabled: !!id
  });
}

export function useCreatePR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      prId: number;
      prTitle: string;
      prContent?: string;
      issueId?: number;
    }) => createPR(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prs'] });
    }
  });
}
