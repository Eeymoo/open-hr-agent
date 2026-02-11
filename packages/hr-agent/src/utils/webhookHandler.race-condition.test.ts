import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIssueFromWebhook } from '../utils/webhookHandler.js';
import { getPrismaClient, getCurrentTimestamp, setTimestamps, INACTIVE_TIMESTAMP } from '../utils/database.js';
import { handleIssuesOpened, handleIssuesLabeled } from '../utils/webhookHandler.js';

vi.mock('../utils/database.js');

describe('WebhookHandler - Race Condition Tests', () => {
  let mockPrismaClient: any;

  beforeEach(() => {
    mockPrismaClient = {
      issue: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn()
      },
      task: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn()
      }
    };

    (getPrismaClient as any).mockReturnValue(mockPrismaClient);
    (getCurrentTimestamp as any).mockReturnValue(Date.now());

    global.taskManager = {
      run: vi.fn()
    };
  });

  it('should handle concurrent issue creation gracefully', async () => {
    const issueId = 123;
    const issueUrl = 'https://github.com/test/test/issues/123';
    const issueTitle = 'Test Issue';
    const issueContent = 'Test content';

    mockPrismaClient.issue.create
      .mockResolvedValueOnce({
        id: 1,
        issueId,
        issueUrl,
        issueTitle,
        issueContent,
        completedAt: INACTIVE_TIMESTAMP,
        deletedAt: INACTIVE_TIMESTAMP,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      .mockRejectedValueOnce({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (issueId)'
      });

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: 1,
      issueId,
      issueUrl,
      issueTitle,
      issueContent,
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const result1 = await createIssueFromWebhook(issueId, issueUrl, issueTitle, issueContent);
    const result2 = await createIssueFromWebhook(issueId, issueUrl, issueTitle, issueContent);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('Issue with this issueId already exists');
  });

  it('should check for existing tasks before creating new ones', async () => {
    const payload = {
      action: 'opened',
      issue: {
        id: 123,
        number: 456,
        title: 'Test Issue',
        body: 'Test content',
        html_url: 'https://github.com/test/test/issues/456',
        user: { login: 'testuser' },
        state: 'open',
        labels: [{ name: 'hra' }]
      },
      repository: {
        full_name: 'test/test',
        id: 1
      },
      sender: {
        login: 'testuser'
      }
    };

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: 1,
      issueId: 456,
      issueUrl: 'https://github.com/test/test/issues/456',
      issueTitle: 'Test Issue',
      issueContent: 'Test content',
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    mockPrismaClient.task.findFirst.mockResolvedValue({
      id: 1,
      type: 'create_ca',
      status: 'running',
      issueId: 1
    });

    const taskManager = global.taskManager as any;
    taskManager.run.mockResolvedValue(1);

    await handleIssuesOpened(payload);

    expect(taskManager.run).not.toHaveBeenCalled();
  });

  it('should create task if no existing tasks found', async () => {
    const payload = {
      action: 'opened',
      issue: {
        id: 123,
        number: 456,
        title: 'Test Issue',
        body: 'Test content',
        html_url: 'https://github.com/test/test/issues/456',
        user: { login: 'testuser' },
        state: 'open',
        labels: [{ name: 'hra' }]
      },
      repository: {
        full_name: 'test/test',
        id: 1
      },
      sender: {
        login: 'testuser'
      }
    };

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: 1,
      issueId: 456,
      issueUrl: 'https://github.com/test/test/issues/456',
      issueTitle: 'Test Issue',
      issueContent: 'Test content',
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    mockPrismaClient.task.findFirst.mockResolvedValue(null);

    const taskManager = global.taskManager as any;
    taskManager.run.mockResolvedValue(1);

    await handleIssuesOpened(payload);

    expect(taskManager.run).toHaveBeenCalledWith('create_ca', { issueNumber: 456 }, expect.any(Number), 1);
  });

  it('should handle labeled event correctly', async () => {
    const payload = {
      action: 'labeled',
      issue: {
        id: 123,
        number: 789,
        title: 'Test Issue',
        body: 'Test content',
        html_url: 'https://github.com/test/test/issues/789',
        user: { login: 'testuser' },
        state: 'open',
        labels: [{ name: 'hra' }]
      },
      repository: {
        full_name: 'test/test',
        id: 1
      },
      sender: {
        login: 'testuser'
      }
    };

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: 2,
      issueId: 789,
      issueUrl: 'https://github.com/test/test/issues/789',
      issueTitle: 'Test Issue',
      issueContent: 'Test content',
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    mockPrismaClient.task.findFirst.mockResolvedValue(null);

    const taskManager = global.taskManager as any;
    taskManager.run.mockResolvedValue(2);

    await handleIssuesLabeled(payload);

    expect(taskManager.run).toHaveBeenCalledWith('create_ca', { issueNumber: 789 }, expect.any(Number), 2);
  });
});
