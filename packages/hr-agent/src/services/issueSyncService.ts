import { getPrismaClient, getCurrentTimestamp, INACTIVE_TIMESTAMP } from '../utils/database.js';

export interface IssueSyncData {
  issueId: number;
  issueUrl: string;
  issueTitle: string;
  issueContent?: string | null;
  state?: 'open' | 'closed';
}

export interface IssueSyncResult {
  success: boolean;
  issue?: {
    id: number;
    issueId: number;
    isNew: boolean;
  };
  error?: string;
}

const ACTIVE_STATUSES = ['planned', 'queued', 'running', 'retrying'];

export async function syncIssueFromWebhook(data: IssueSyncData): Promise<IssueSyncResult> {
  const prisma = getPrismaClient();

  try {
    const existingIssue = await prisma.issue.findUnique({
      where: { issueId: data.issueId }
    });

    const now = getCurrentTimestamp();

    if (existingIssue) {
      const updateData: {
        issueUrl: string;
        issueTitle: string;
        issueContent: string | null;
        updatedAt: number;
        completedAt?: number;
      } = {
        issueUrl: data.issueUrl,
        issueTitle: data.issueTitle,
        issueContent: data.issueContent ?? null,
        updatedAt: now
      };

      if (data.state === 'closed') {
        updateData.completedAt = now;
      } else if (data.state === 'open' && existingIssue.completedAt !== INACTIVE_TIMESTAMP) {
        updateData.completedAt = INACTIVE_TIMESTAMP;
      }

      await prisma.issue.update({
        where: { id: existingIssue.id },
        data: updateData
      });

      return {
        success: true,
        issue: {
          id: existingIssue.id,
          issueId: data.issueId,
          isNew: false
        }
      };
    }

    const issue = await prisma.issue.create({
      data: {
        issueId: data.issueId,
        issueUrl: data.issueUrl,
        issueTitle: data.issueTitle,
        issueContent: data.issueContent ?? null,
        completedAt: data.state === 'closed' ? now : INACTIVE_TIMESTAMP,
        deletedAt: INACTIVE_TIMESTAMP,
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      issue: {
        id: issue.id,
        issueId: data.issueId,
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

export async function updateIssueState(
  issueId: number,
  state: 'open' | 'closed'
): Promise<{ success: boolean; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const issue = await prisma.issue.findUnique({
      where: { issueId }
    });

    if (!issue) {
      return {
        success: false,
        error: `Issue #${issueId} not found`
      };
    }

    const now = getCurrentTimestamp();
    const updateData: { updatedAt: number; completedAt?: number } = {
      updatedAt: now
    };

    if (state === 'closed') {
      updateData.completedAt = now;
    } else {
      updateData.completedAt = INACTIVE_TIMESTAMP;
    }

    await prisma.issue.update({
      where: { id: issue.id },
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

export async function cancelTasksForIssue(issueId: number): Promise<{
  success: boolean;
  cancelledCount: number;
  error?: string;
}> {
  const prisma = getPrismaClient();

  try {
    const issue = await prisma.issue.findUnique({
      where: { issueId },
      include: {
        tasks: {
          where: {
            status: { in: ACTIVE_STATUSES }
          }
        }
      }
    });

    if (!issue) {
      return {
        success: false,
        cancelledCount: 0,
        error: `Issue #${issueId} not found`
      };
    }

    if (issue.tasks.length === 0) {
      return {
        success: true,
        cancelledCount: 0
      };
    }

    const now = getCurrentTimestamp();
    const taskIds = issue.tasks.map((t) => t.id);

    await prisma.task.updateMany({
      where: {
        id: { in: taskIds }
      },
      data: {
        status: 'cancelled',
        updatedAt: now,
        completedAt: now
      }
    });

    return {
      success: true,
      cancelledCount: taskIds.length
    };
  } catch (error) {
    return {
      success: false,
      cancelledCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function reopenTasksForIssue(issueId: number): Promise<{
  success: boolean;
  reopenedCount: number;
  error?: string;
}> {
  const prisma = getPrismaClient();

  try {
    const issue = await prisma.issue.findUnique({
      where: { issueId },
      include: {
        tasks: {
          where: {
            status: 'completed'
          }
        }
      }
    });

    if (!issue) {
      return {
        success: false,
        reopenedCount: 0,
        error: `Issue #${issueId} not found`
      };
    }

    if (issue.tasks.length === 0) {
      return {
        success: true,
        reopenedCount: 0
      };
    }

    const now = getCurrentTimestamp();
    const taskIds = issue.tasks.map((t) => t.id);

    await prisma.task.updateMany({
      where: {
        id: { in: taskIds }
      },
      data: {
        status: 'planned',
        updatedAt: now,
        completedAt: INACTIVE_TIMESTAMP
      }
    });

    return {
      success: true,
      reopenedCount: taskIds.length
    };
  } catch (error) {
    return {
      success: false,
      reopenedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function completeTasksForIssue(issueId: number): Promise<{
  success: boolean;
  completedCount: number;
  error?: string;
}> {
  const prisma = getPrismaClient();

  try {
    const issue = await prisma.issue.findUnique({
      where: { issueId },
      include: {
        tasks: {
          where: {
            status: { in: ACTIVE_STATUSES }
          }
        }
      }
    });

    if (!issue) {
      return {
        success: false,
        completedCount: 0,
        error: `Issue #${issueId} not found`
      };
    }

    if (issue.tasks.length === 0) {
      return {
        success: true,
        completedCount: 0
      };
    }

    const now = getCurrentTimestamp();
    const taskIds = issue.tasks.map((t) => t.id);

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
