import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIssues, getIssue, createIssue, updateIssue, deleteIssue } from '../api/issues';
import type { Issue, PaginationParams } from '../types/issue';

export function useIssues(params?: PaginationParams) {
  return useQuery({
    queryKey: ['issues', params],
    queryFn: async () => {
      const response = await getIssues(params);
      return response.data.data;
    }
  });
}

export function useIssue(id: number) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const response = await getIssue(id);
      return response.data.data;
    },
    enabled: !!id
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      issueId: number;
      issueUrl: string;
      issueTitle: string;
      issueContent?: string;
    }) => createIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Issue> }) => updateIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });
}
