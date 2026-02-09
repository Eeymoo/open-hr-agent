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
