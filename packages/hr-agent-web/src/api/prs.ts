import apiClient from './client';
import type { ApiResponse, PRsListResponse } from '../types/api';
import type { PullRequest } from '../types/pr';
import type { PaginationParams } from '../types/issue';

export const getPRs = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<PRsListResponse>>('/v1/prs/index', { params });
};

export const getPR = (id: number) => {
  return apiClient.get<ApiResponse<PullRequest>>(`/v1/prs/${id}/index`);
};
