import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { PullRequest, PRListResponse } from '../types/pr';
import type { PaginationParams } from '../types/issue';

export const getPRs = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<PRListResponse>>('/v1/prs', { params });
};

export const getPR = (id: number) => {
  return apiClient.get<ApiResponse<PullRequest>>(`/v1/prs/${id}`);
};

export const createPR = (data: {
  prId: number;
  prTitle: string;
  prContent?: string;
  issueId?: number;
}) => {
  return apiClient.post<ApiResponse<PullRequest>>('/v1/prs', data);
};

export const updatePR = (id: number, data: Partial<PullRequest>) => {
  return apiClient.put<ApiResponse<PullRequest>>(`/v1/prs/${id}`, data);
};

export const deletePR = (id: number) => {
  return apiClient.delete<ApiResponse<void>>(`/v1/prs/${id}`);
};
