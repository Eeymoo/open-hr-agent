import apiClient from './client';
import type { ApiResponse, IssuesListResponse } from '../types/api';
import type { Issue, PaginationParams } from '../types/issue';

export const getIssues = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<IssuesListResponse>>('/v1/issues', { params });
};

export const getIssue = (id: number) => {
  return apiClient.get<ApiResponse<Issue>>(`/v1/issues/${id}`);
};
