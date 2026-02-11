import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCodingAgents,
  getCodingAgent,
  createCodingAgent,
  updateCodingAgent,
  deleteCodingAgent,
  getCAStatus
} from '../api/ca';
import type { PaginationParams } from '../types/ca';

export function useCodingAgents(params?: PaginationParams) {
  return useQuery({
    queryKey: ['coding-agents', params],
    queryFn: async () => {
      const response = await getCodingAgents(params);
      return response.data.data;
    }
  });
}

export function useCodingAgent(id: number) {
  return useQuery({
    queryKey: ['coding-agent', id],
    queryFn: async () => {
      const response = await getCodingAgent(id);
      return response.data.data;
    },
    enabled: !!id
  });
}

export function useCreateCodingAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      caName: string;
      status?: string;
      dockerConfig?: Record<string, unknown>;
    }) => createCodingAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cas'] });
      queryClient.invalidateQueries({ queryKey: ['coding-agents'] });
    }
  });
}

export function useUpdateCodingAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: number;
      data: { containerId?: string; status?: string; dockerConfig?: Record<string, unknown> };
    }) => updateCodingAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cas'] });
      queryClient.invalidateQueries({ queryKey: ['coding-agents'] });
    }
  });
}

export function useDeleteCodingAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCodingAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cas'] });
      queryClient.invalidateQueries({ queryKey: ['coding-agents'] });
    }
  });
}

export function useCAStatus() {
  return useQuery({
    queryKey: ['ca-status'],
    queryFn: async () => {
      const response = await getCAStatus();
      return response.data;
    },
    refetchInterval: 5000
  });
}

export function useCADetails() {
  return useQuery({
    queryKey: ['ca-details'],
    queryFn: async () => {
      const response = await getCAStatus();
      return response.data.data?.caList ?? [];
    },
    refetchInterval: 5000
  });
}
