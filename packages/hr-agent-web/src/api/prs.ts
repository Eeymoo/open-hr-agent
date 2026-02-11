import apiClient from './client';
import type { ApiResponse, PRsListResponse } from '../types/api';
import type { PullRequest } from '../types/pr';
import type { PaginationParams } from '../types/issue';

/**
 * 获取 Pull Request 列表
 * @param params - 分页和筛选参数
 * @returns API 响应，包含 PR 列表和分页信息
 */
export const getPRs = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<PRsListResponse>>('/v1/prs', { params });
};

/**
 * 根据 ID 获取指定的 Pull Request
 * @param id - Pull Request ID
 * @returns API 响应，包含 PR 对象
 */
export const getPR = (id: number) => {
  return apiClient.get<ApiResponse<PullRequest>>(`/v1/prs/${id}`);
};
