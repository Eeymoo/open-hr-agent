import { getPrismaClient, getCurrentTimestamp, INACTIVE_TIMESTAMP } from '../utils/database.js';

export interface PullRequestSyncData {
  prId: number;
  prTitle: string;
  prContent?: string | null;
  prUrl: string;
  state?: 'open' | 'closed';
  merged?: boolean;
  headRef?: string;
  headSha?: string;
  baseRef?: string;
}

export interface PullRequestSyncResult {
  success: boolean;
  pullRequest?: {
    id: number;
    prId: number;
    isNew: boolean;
  };
  error?: string;
}

const ACTIVE_STATUSES = ['planned', 'queued', 'running', 'retrying'];

export async function syncPullRequestFromWebhook(
  data: PullRequestSyncData
): Promise<PullRequestSyncResult> {
  const prisma = getPrismaClient();

  try {
    const existingPR = await prisma.pullRequest.findUnique({
      where: { prId: data.prId }
    });

    const now = getCurrentTimestamp();

    if (existingPR) {
      const updateData: {
        prTitle: string;
        prContent: string | null;
        prUrl: string;
        updatedAt: number;
        completedAt?: number;
      } = {
        prTitle: data.prTitle,
        prContent: data.prContent ?? null,
        prUrl: data.prUrl,
        updatedAt: now
      };

      if (data.merged === true) {
        updateData.completedAt = now;
      } else if (data.state === 'open' && existingPR.completedAt !== INACTIVE_TIMESTAMP) {
        updateData.completedAt = INACTIVE_TIMESTAMP;
      }

      await prisma.pullRequest.update({
        where: { id: existingPR.id },
        data: updateData
      });

      return {
        success: true,
        pullRequest: {
          id: existingPR.id,
          prId: data.prId,
          isNew: false
        }
      };
    }

    const pullRequest = await prisma.pullRequest.create({
      data: {
        prId: data.prId,
        prTitle: data.prTitle,
        prContent: data.prContent ?? null,
        prUrl: data.prUrl,
        issueId: null,
        completedAt: data.merged === true || data.state === 'closed' ? now : INACTIVE_TIMESTAMP,
        deletedAt: INACTIVE_TIMESTAMP,
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      pullRequest: {
        id: pullRequest.id,
        prId: data.prId,
        isNew: true
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function linkPRToIssue(
  prId: number,
  issueNumber: number
): Promise<{ success: boolean; linked: boolean; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const pr = await prisma.pullRequest.findUnique({
      where: { prId }
    });

    if (!pr) {
      return {
        success: false,
        linked: false,
        error: `PR #${prId} not found`
      };
    }

    const issue = await prisma.issue.findUnique({
      where: { issueId: issueNumber }
    });

    if (!issue) {
      return {
        success: false,
        linked: false,
        error: `Issue #${issueNumber} not found`
      };
    }

    const existingLink = await prisma.issuePR.findUnique({
      where: {
        issueId_prId: {
          issueId: issue.id,
          prId: pr.id
        }
      }
    });

    if (existingLink) {
      return {
        success: true,
        linked: true
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.issuePR.create({
        data: {
          issueId: issue.id,
          prId: pr.id
        }
      });

      await tx.pullRequest.update({
        where: { id: pr.id },
        data: { issueId: issue.id }
      });
    });

    return {
      success: true,
      linked: true
    };
  } catch (error) {
    return {
      success: false,
      linked: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updatePullRequestState(
  prId: number,
  state: 'open' | 'closed',
  merged?: boolean
): Promise<{ success: boolean; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const pr = await prisma.pullRequest.findUnique({
      where: { prId }
    });

    if (!pr) {
      return {
        success: false,
        error: `PR #${prId} not found`
      };
    }

    const now = getCurrentTimestamp();
    const updateData: { updatedAt: number; completedAt?: number } = {
      updatedAt: now
    };

    if (state === 'closed' || merged === true) {
      updateData.completedAt = now;
    } else if (state === 'open') {
      updateData.completedAt = INACTIVE_TIMESTAMP;
    }

    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: updateData
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function completeTasksForPR(prId: number): Promise<{
  success: boolean;
  completedCount: number;
  error?: string;
}> {
  const prisma = getPrismaClient();

  try {
    const pr = await prisma.pullRequest.findUnique({
      where: { prId },
      include: {
        tasks: {
          where: {
            status: { in: ACTIVE_STATUSES }
          }
        }
      }
    });

    if (!pr) {
      return {
        success: false,
        completedCount: 0,
        error: `PR #${prId} not found`
      };
    }

    if (pr.tasks.length === 0) {
      return {
        success: true,
        completedCount: 0
      };
    }

    const now = getCurrentTimestamp();
    const taskIds = pr.tasks.map((t) => t.id);

    await prisma.task.updateMany({
      where: {
        id: { in: taskIds }
      },
      data: {
        status: 'completed',
        updatedAt: now,
        completedAt: now
      }
    });

    return {
      success: true,
      completedCount: taskIds.length
    };
  } catch (error) {
    return {
      success: false,
      completedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function completeLinkedIssue(
  prId: number
): Promise<{ success: boolean; issueId?: number; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const pr = await prisma.pullRequest.findUnique({
      where: { prId },
      include: { issuePrs: true }
    });

    if (!pr) {
      return {
        success: false,
        error: `PR #${prId} not found`
      };
    }

    const linkedIssuePRs = pr.issuePrs;
    if (linkedIssuePRs.length === 0) {
      return {
        success: true
      };
    }

    const now = getCurrentTimestamp();

    for (const issuePR of linkedIssuePRs) {
      await prisma.issue.update({
        where: { id: issuePR.issueId },
        data: {
          completedAt: now,
          updatedAt: now
        }
      });

      await prisma.task.updateMany({
        where: {
          issueId: issuePR.issueId,
          status: { in: ACTIVE_STATUSES }
        },
        data: {
          status: 'completed',
          updatedAt: now,
          completedAt: now
        }
      });
    }

    return {
      success: true,
      issueId: linkedIssuePRs[0]?.issueId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export function extractIssueNumberFromTitle(title: string): number | null {
  const match = title.match(/#(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
