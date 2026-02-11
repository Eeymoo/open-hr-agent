import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { CodingAgent, CADetail, CAListResponse, PaginationParams } from '../types/ca';

export const getCodingAgents = (params?: PaginationParams) => {
  return apiClient.get<ApiResponse<CAListResponse>>('/v1/cas', { params });
};

export const getCodingAgent = (id: number) => {
  return apiClient.get<ApiResponse<CodingAgent>>(`/v1/cas/${id}`);
};

export const createCodingAgent = (data: {
  caName: string;
  status?: string;
  dockerConfig?: Record<string, unknown>;
}) => {
  return apiClient.post<ApiResponse<CodingAgent>>('/v1/cas', data);
};

export const updateCodingAgent = (
  id: number,
  data: {
    containerId?: string;
    status?: string;
    dockerConfig?: Record<string, unknown>;
  }
) => {
  return apiClient.put<ApiResponse<CodingAgent>>(`/v1/cas/${id}`, data);
};

export const deleteCodingAgent = (id: number) => {
  return apiClient.delete<ApiResponse<void>>(`/v1/cas/${id}`);
};

export const getCAStatus = () => {
  return apiClient.get<
    ApiResponse<{
      caPool: { total: number; idle: number; busy: number; creating: number; error: number };
      caList: CADetail[];
    }>
  >('/v1/ca/status');
};
