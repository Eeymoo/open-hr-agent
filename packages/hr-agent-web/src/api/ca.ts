import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { CodingAgent } from '../types/ca';

/**
 * 获取所有 Coding Agent 列表
 * @returns API 响应，包含 Coding Agent 数组
 */
export const getCAs = () => {
  return apiClient.get<ApiResponse<CodingAgent[]>>('/v1/ca');
};

/**
 * 根据名称获取指定的 Coding Agent
 * @param name - Coding Agent 名称
 * @returns API 响应，包含 Coding Agent 对象
 */
export const getCA = (name: string) => {
  return apiClient.get<ApiResponse<CodingAgent>>(`/v1/ca/${name}`);
};
