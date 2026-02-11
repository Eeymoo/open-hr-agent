import apiClient from './client';
import type { ApiResponse, TasksListResponse } from '../types/api';
import type { Task, CreateTaskDto, UpdateTaskDto, TaskQueryParams } from '../types/task';

/**
 * 获取任务列表
 * @param params - 查询和分页参数
 * @returns API 响应，包含任务列表和分页信息
 */
export const getTasks = (params?: TaskQueryParams) => {
  return apiClient.get<ApiResponse<TasksListResponse>>('/v1/tasks', { params });
};

/**
 * 根据 ID 获取指定任务
 * @param id - 任务 ID
 * @returns API 响应，包含任务对象
 */
export const getTask = (id: number) => {
  return apiClient.get<ApiResponse<Task>>(`/v1/tasks/${id}`);
};

/**
 * 创建新任务
 * @param data - 任务数据
 * @returns API 响应，包含创建的任务
 */
export const createTask = (data: CreateTaskDto) => {
  return apiClient.post<ApiResponse<Task>>('/v1/tasks', data);
};

/**
 * 更新任务
 * @param id - 任务 ID
 * @param data - 更新数据
 * @returns API 响应，包含更新后的任务
 */
export const updateTask = (id: number, data: UpdateTaskDto) => {
  return apiClient.put<ApiResponse<Task>>(`/v1/tasks/${id}`, data);
};

/**
 * 删除任务
 * @param id - 任务 ID
 * @returns API 响应
 */
export const deleteTask = (id: number) => {
  return apiClient.delete<ApiResponse<void>>(`/v1/tasks/${id}`);
};

/**
 * 执行任务
 * @param id - 任务 ID
 * @returns API 响应
 */
export const executeTask = (id: number) => {
  return apiClient.post<ApiResponse<void>>('/v1/tasks/execute', { taskId: id });
};
