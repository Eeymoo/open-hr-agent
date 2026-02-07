import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  class MockPrismaClient {
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }
  return { PrismaClient: MockPrismaClient };
});

import {
  getPrismaClient,
  getCurrentTimestamp,
  softDeleteFilter,
  setTimestamps,
  setCompletedAt,
  setDeletedAt,
  disconnectPrisma
} from './database.js';

describe('database utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPrismaClient', () => {
    it('should return singleton Prisma client instance', async () => {
      const client1 = getPrismaClient();
      const client2 = getPrismaClient();
      expect(client1).toBe(client2);
      await disconnectPrisma();
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return current Unix timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now() / 1000);
    });
  });

  describe('softDeleteFilter', () => {
    it('should return soft delete filter', () => {
      const filter = softDeleteFilter();
      expect(filter).toEqual({ deletedAt: -2 });
    });
  });

  describe('setTimestamps', () => {
    it('should set createdAt and updatedAt for new records', () => {
      const data = { name: 'test', createdAt: 0, updatedAt: 0 };
      const result = setTimestamps(data);
      expect(result.createdAt).toBeGreaterThan(0);
      expect(result.updatedAt).toBeGreaterThan(0);
      expect(result.createdAt).toBe(result.updatedAt);
    });

    it('should only set updatedAt for updates', () => {
      const data = { name: 'test', createdAt: 1000, updatedAt: 0 };
      const result = setTimestamps(data, true);
      expect(result.createdAt).toBe(1000);
      expect(result.updatedAt).toBeGreaterThan(1000);
    });
  });

  describe('setCompletedAt', () => {
    it('should set completedAt timestamp', () => {
      const data = { name: 'test', completedAt: 0 };
      const result = setCompletedAt(data);
      expect(result.completedAt).toBeGreaterThan(0);
    });
  });

  describe('setDeletedAt', () => {
    it('should set deletedAt timestamp', () => {
      const data = { name: 'test', deletedAt: 0 };
      const result = setDeletedAt(data);
      expect(result.deletedAt).toBeGreaterThan(0);
    });
  });

  describe('disconnectPrisma', () => {
    it('should disconnect and clear Prisma client', async () => {
      const client = getPrismaClient();
      await disconnectPrisma();
      const newClient = getPrismaClient();
      expect(newClient).not.toBe(client);
      await disconnectPrisma();
    });
  });
});
