import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { Issue, IssueListResponse, PaginationParams } from '../types/issue';

export const getIssues = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<IssueListResponse>>('/v1/issues', { params });
};

export const getIssue = (id: number) => {
  return apiClient.get<ApiResponse<Issue>>(`/v1/issues/${id}`);
};

export const createIssue = (data: {
  issueId: number;
  issueUrl: string;
  issueTitle: string;
  issueContent?: string;
}) => {
  return apiClient.post<ApiResponse<Issue>>('/v1/issues', data);
};

export const updateIssue = (id: number, data: Partial<Issue>) => {
  return apiClient.put<ApiResponse<Issue>>(`/v1/issues/${id}`, data);
};

export const deleteIssue = (id: number) => {
  return apiClient.delete<ApiResponse<void>>(`/v1/issues/${id}`);
};
