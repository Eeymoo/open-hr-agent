import apiClient from './client';
import type { ApiResponse, IssuesListResponse } from '../types/api';
import type { Issue, PaginationParams } from '../types/issue';

/**
 * 获取 Issue 列表
 * @param params - 分页和筛选参数
 * @returns API 响应，包含 Issue 列表和分页信息
 */
export const getIssues = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<IssuesListResponse>>('/v1/issues', { params });
};

/**
 * 根据 ID 获取指定的 Issue
 * @param id - Issue ID
 * @returns API 响应，包含 Issue 对象
 */
export const getIssue = (id: number) => {
  return apiClient.get<ApiResponse<Issue>>(`/v1/issues/${id}`);
};
