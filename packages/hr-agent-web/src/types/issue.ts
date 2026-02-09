export interface Issue {
  id: number;
  issueId: number;
  issueUrl: string;
  issueTitle: string;
  issueContent?: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number;
  deletedAt: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
}
