import apiClient from './client';
import type { ApiResponse, TasksListResponse } from '../types/api';
import type { Task, CreateTaskDto, UpdateTaskDto, TaskQueryParams } from '../types/task';

export const getTasks = (params?: TaskQueryParams) => {
  return apiClient.get<ApiResponse<TasksListResponse>>('/v1/tasks', { params });
};

export const getTask = (id: number) => {
  return apiClient.get<ApiResponse<Task>>(`/v1/tasks/${id}`);
};

export const createTask = (data: CreateTaskDto) => {
  return apiClient.post<ApiResponse<Task>>('/v1/tasks', data);
};

export const updateTask = (id: number, data: UpdateTaskDto) => {
  return apiClient.put<ApiResponse<Task>>(`/v1/tasks/${id}`, data);
};

export const deleteTask = (id: number) => {
  return apiClient.delete<ApiResponse<void>>(`/v1/tasks/${id}`);
};

export const executeTask = (id: number) => {
  return apiClient.post<ApiResponse<void>>('/v1/tasks/execute', { taskId: id });
};
