import apiClient from './client';
import type { ApiResponse } from '../types/api';

export interface AppConfig {
  caNamePrefix: string;
}

export const getConfig = () => {
  return apiClient.get<ApiResponse<AppConfig>>('/v1/config');
};
