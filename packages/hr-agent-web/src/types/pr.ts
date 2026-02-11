export interface PullRequest {
  id: number;
  prId: number;
  prTitle: string;
  prContent?: string;
  issueId?: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number;
  deletedAt: number;
}

export interface PRListResponse {
  prs: PullRequest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
