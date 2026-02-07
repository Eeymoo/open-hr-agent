import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import issuesWebhook from './issues.post.js';

describe('Issues Webhook Route', () => {
  it('should process webhook and return 200 status', async () => {
    const mockReq = {
      headers: {
        'x-github-event': 'issues',
        'x-github-delivery': 'test-id',
        'content-type': 'application/json'
      },
      body: {
        action: 'opened',
        issue: {
          number: 1,
          title: 'Test Issue',
          labels: [{ name: 'hra' }]
        },
        repository: {
          full_name: 'test/repo'
        }
      }
    };

    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockRes = {
      status: mockStatus,
      json: mockJson
    };

    await issuesWebhook(mockReq as any, mockRes as any);

    expect(mockStatus).toHaveBeenCalledWith(200);
  });

  it('should return success message in response', async () => {
    const mockReq = {
      headers: {
        'x-github-event': 'issues',
        'x-github-delivery': 'test-id',
        'content-type': 'application/json'
      },
      body: {
        action: 'opened',
        issue: {
          number: 1,
          title: 'Test Issue',
          labels: [{ name: 'hra' }]
        },
        repository: {
          full_name: 'test/repo'
        }
      }
    };

    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockRes = {
      status: mockStatus,
      json: mockJson
    };

    await issuesWebhook(mockReq as any, mockRes as any);

    expect(mockJson).toHaveBeenCalledWith({
      message: 'Webhook processed successfully'
    });
  });

  it('should handle missing required headers gracefully', async () => {
    const mockReq = {
      headers: {},
      body: {}
    };

    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockRes = {
      status: mockStatus,
      json: mockJson
    };

    await issuesWebhook(mockReq as any, mockRes as any);

    expect(mockStatus).toHaveBeenCalledWith(200);
  });
});
