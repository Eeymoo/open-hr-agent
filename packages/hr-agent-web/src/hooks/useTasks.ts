import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  executeTask,
  reorderTasks
} from '../api/tasks';
import { POLLING_INTERVAL } from '../utils/constants';
import type { CreateTaskDto, UpdateTaskDto, TaskQueryParams, ReorderTasksDto } from '../types/task';

export function useTasks(params?: TaskQueryParams) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const response = await getTasks(params);
      return response.data.data;
    },
    refetchInterval: POLLING_INTERVAL
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const response = await getTask(id);
      return response.data.data;
    },
    enabled: !!id,
    refetchInterval: POLLING_INTERVAL
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDto) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskDto }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useExecuteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => executeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderTasksDto) => reorderTasks(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}
