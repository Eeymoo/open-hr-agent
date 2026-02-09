export type CAStatus = 'pending' | 'running' | 'idle' | 'error';

export interface CodingAgent {
  id: number;
  caName: string;
  containerId?: string;
  status: CAStatus;
  dockerConfig?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  completedAt: number;
  deletedAt: number;
}

export const CA_STATUS_LABELS: Record<CAStatus, string> = {
  pending: '待创建',
  running: '运行中',
  idle: '空闲',
  error: '错误'
};

export const CA_STATUS_COLORS: Record<CAStatus, string> = {
  pending: 'default',
  running: 'processing',
  idle: 'success',
  error: 'error'
};
