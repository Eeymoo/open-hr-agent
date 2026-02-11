export type CAStatus =
  | 'pending'
  | 'running'
  | 'idle'
  | 'error'
  | 'creating'
  | 'busy'
  | 'destroying';

export interface CodingAgent {
  id: number;
  caName: string;
  containerId?: string | null;
  status: CAStatus;
  dockerConfig?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number;
  deletedAt: number;
  logs?: CodingAgentLog[];
}

export interface CodingAgentLog {
  id: number;
  caId: number;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
}

export interface CADetail {
  id: number;
  caName: string;
  containerId: string | null;
  status: CAStatus;
  createdAt: number;
  updatedAt: number;
  currentTaskId?: number;
  currentTaskType?: string;
  issueNumber?: number;
}

export interface CAListResponse {
  cas: CodingAgent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  status?: CAStatus;
}

export const CA_STATUS_LABELS: Record<CAStatus, string> = {
  pending: '待创建',
  running: '运行中',
  idle: '空闲',
  error: '错误',
  creating: '创建中',
  busy: '忙碌',
  destroying: '销毁中'
};

export const CA_STATUS_COLORS: Record<CAStatus, string> = {
  pending: 'default',
  running: 'processing',
  idle: 'success',
  error: 'error',
  creating: 'processing',
  busy: 'warning',
  destroying: 'default'
};
