import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { getPrismaClient } from '../../../../utils/database.js';

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

vi.mock('../../../../utils/database.js', () => ({
  getPrismaClient: vi.fn(),
  SOFT_DELETE_FLAG: -2
}));

interface MockPrismaClient {
  issuePR: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  issue: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  pullRequest: {
    findFirst: ReturnType<typeof vi.fn>;
  };
}

describe('Issue PR Relation API', () => {
  let app: Express;
  let mockPrismaClient: MockPrismaClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockPrismaClient = {
      issuePR: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn()
      },
      issue: {
        findFirst: vi.fn()
      },
      pullRequest: {
        findFirst: vi.fn()
      }
    };
    (getPrismaClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPrismaClient);
  });

  describe('GET /v1/issues/:issueId/prs', () => {
    it('should return all PRs for a valid issue', async () => {
      const mockPrs = [
        { id: 1, prId: 101, prTitle: 'PR 1' },
        { id: 2, prId: 102, prTitle: 'PR 2' }
      ];

      const mockIssuePr1 = {
        pr: mockPrs[0],
        createdAt: 0,
        issueId: 1
      };
      const mockIssuePr2 = {
        pr: mockPrs[1],
        createdAt: 0,
        issueId: 1
      };

      mockPrismaClient.issuePR.findMany.mockResolvedValue([mockIssuePr1, mockIssuePr2]);

      const { default: route } = await import('./prs.get.js');
      app.get('/v1/issues/:issueId/prs', route);

      const response = await request(app).get('/v1/issues/1/prs');

      expect(response.body.code).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].prTitle).toBe('PR 1');
      expect(response.body.data[1].prTitle).toBe('PR 2');
    });

    it('should return 400 for invalid issue ID', async () => {
      const { default: route } = await import('./prs.get.js');
      app.get('/v1/issues/:issueId/prs', route);

      const response = await request(app).get('/v1/issues/invalid/prs');

      expect(response.body.code).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Invalid issue ID');
    });

    it('should return empty array for issue with no PRs', async () => {
      mockPrismaClient.issuePR.findMany.mockResolvedValue([]);

      const { default: route } = await import('./prs.get.js');
      app.get('/v1/issues/:issueId/prs', route);

      const response = await request(app).get('/v1/issues/1/prs');

      expect(response.body.code).toBe(HTTP_STATUS.OK);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /v1/issues/:issueId/latest-pr', () => {
    it('should return the latest PR for a valid issue', async () => {
      const mockPr = { id: 1, prId: 101, prTitle: 'Latest PR' };

      mockPrismaClient.issuePR.findFirst.mockResolvedValue({
        pr: mockPr,
        createdAt: 0,
        issueId: 1
      });

      const { default: route } = await import('./latest-pr.get.js');
      app.get('/v1/issues/:issueId/latest-pr', route);

      const response = await request(app).get('/v1/issues/1/latest-pr');

      expect(response.body.code).toBe(HTTP_STATUS.OK);
      expect(response.body.data).not.toBeNull();
      expect(response.body.data.prTitle).toBe('Latest PR');
    });

    it('should return 404 when no PR exists', async () => {
      mockPrismaClient.issuePR.findFirst.mockResolvedValue(null);
      mockPrismaClient.issuePR.findMany.mockResolvedValue([]);

      const { default: route } = await import('./latest-pr.get.js');
      app.get('/v1/issues/:issueId/latest-pr', route);

      const response = await request(app).get('/v1/issues/1/latest-pr');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.code).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('No PR found');
    });
  });

  describe('PUT /v1/issues/:issueId/latest-pr', () => {
    it('should associate a PR with an issue', async () => {
      mockPrismaClient.issue.findFirst.mockResolvedValue({ id: 1, deletedAt: -2 });
      mockPrismaClient.pullRequest.findFirst.mockResolvedValue({ id: 2, deletedAt: -2 });
      mockPrismaClient.issuePR.findUnique.mockResolvedValue(null);
      mockPrismaClient.issuePR.create.mockResolvedValue({
        id: 1,
        issueId: 1,
        prId: 2,
        createdAt: 0
      });

      const { default: route } = await import('./latest-pr.put.js');
      app.put('/v1/issues/:issueId/latest-pr', route);

      const response = await request(app).put('/v1/issues/1/latest-pr').send({ prId: 2 });

      expect(response.body.code).toBe(HTTP_STATUS.CREATED);
      expect(response.body.message).toContain('PR associated with issue successfully');
    });

    it('should return 400 for invalid issue ID', async () => {
      const { default: route } = await import('./latest-pr.put.js');
      app.put('/v1/issues/:issueId/latest-pr', route);

      const response = await request(app).put('/v1/issues/invalid/latest-pr').send({ prId: 2 });

      expect(response.body.code).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Invalid issue ID');
    });

    it('should return 400 for invalid PR ID', async () => {
      const { default: route } = await import('./latest-pr.put.js');
      app.put('/v1/issues/:issueId/latest-pr', route);

      const response = await request(app).put('/v1/issues/1/latest-pr').send({ prId: 'invalid' });

      expect(response.body.code).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Invalid PR ID');
    });

    it('should return 200 if PR already associated', async () => {
      mockPrismaClient.issue.findFirst.mockResolvedValue({ id: 1, deletedAt: -2 });
      mockPrismaClient.pullRequest.findFirst.mockResolvedValue({ id: 2, deletedAt: -2 });
      mockPrismaClient.issuePR.findUnique.mockResolvedValue({
        id: 1,
        issueId: 1,
        prId: 2,
        createdAt: 0
      });

      const { default: route } = await import('./latest-pr.put.js');
      app.put('/v1/issues/:issueId/latest-pr', route);

      const response = await request(app).put('/v1/issues/1/latest-pr').send({ prId: 2 });

      expect(response.body.code).toBe(HTTP_STATUS.OK);
      expect(response.body.message).toContain('PR already associated');
    });
  });

  describe('GET /v1/prs/:prId/issue', () => {
    it('should return the associated issue for a valid PR', async () => {
      const mockIssue = { id: 1, issueId: 101, issueTitle: 'Test Issue' };

      mockPrismaClient.issuePR.findFirst.mockResolvedValue({
        issue: mockIssue,
        prId: 1,
        createdAt: 0
      });

      const { default: route } = await import('../../prs/[prId]/issue.get.js');
      app.get('/v1/prs/:prId/issue', route);

      const response = await request(app).get('/v1/prs/1/issue');

      expect(response.body.code).toBe(HTTP_STATUS.OK);
      expect(response.body.data).not.toBeNull();
      expect(response.body.data.issueTitle).toBe('Test Issue');
    });

    it('should return 404 when no associated issue exists', async () => {
      mockPrismaClient.issuePR.findFirst.mockResolvedValue(null);

      const { default: route } = await import('../../prs/[prId]/issue.get.js');
      app.get('/v1/prs/:prId/issue', route);

      const response = await request(app).get('/v1/prs/1/issue');

      expect(response.body.code).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('No issue found');
    });

    it('should return 400 for invalid PR ID', async () => {
      const { default: route } = await import('../../prs/[prId]/issue.get.js');
      app.get('/v1/prs/:prId/issue', route);

      const response = await request(app).get('/v1/prs/invalid/issue');

      expect(response.body.code).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Invalid PR ID');
    });
  });
});
