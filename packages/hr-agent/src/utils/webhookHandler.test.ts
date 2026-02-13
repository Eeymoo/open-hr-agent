import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPrismaClient } from './database.js';

vi.mock('./database.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./database.js')>();
  return {
    ...mod,
    getPrismaClient: vi.fn(),
    getCurrentTimestamp: vi.fn(() => 1234567890)
  };
});

vi.mock('@opencode-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('webhookHandler 测试', () => {
  const prismaMock = {
    task: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    codingAgent: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    issue: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    pullRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  } as unknown as ReturnType<typeof getPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(prismaMock);
    console.log = vi.fn();
    console.error = vi.fn();
  });

  describe('webhook handler basic setup', () => {
    it('should have prisma mock configured', () => {
      expect(getPrismaClient()).toBe(prismaMock);
    });
  });
});
