import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { CodingAgent } from '../types/ca';

export const getCAs = () => {
  return apiClient.get<ApiResponse<CodingAgent[]>>('/v1/ca');
};

export const getCA = (name: string) => {
  return apiClient.get<ApiResponse<CodingAgent>>(`/v1/ca/${name}`);
};
