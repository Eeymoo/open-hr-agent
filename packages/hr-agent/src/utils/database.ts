import { PrismaClient } from '@prisma/client';
import { getEnvValue } from './envSecrets.js';

const TIMESTAMP_DIVISOR = 1000;
const SOFT_DELETE_FLAG = -2;
const INACTIVE_TIMESTAMP = -2;

let prismaClient: PrismaClient | null = null;

export { SOFT_DELETE_FLAG, INACTIVE_TIMESTAMP, TIMESTAMP_DIVISOR };

export function getPrismaClient(): PrismaClient {
  if (prismaClient === null) {
    const databaseUrl = getEnvValue('DATABASE_URL');
    if (databaseUrl) {
      process.env.DATABASE_URL = databaseUrl;
    }
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / TIMESTAMP_DIVISOR);
}

export function softDeleteFilter(): { deletedAt: number } {
  return { deletedAt: SOFT_DELETE_FLAG };
}

export function setTimestamps<T extends { createdAt?: number; updatedAt?: number }>(
  data: T,
  isUpdate = false
): T {
  const timestamp = getCurrentTimestamp();
  if (!isUpdate) {
    (data as T & { createdAt: number }).createdAt = timestamp;
  }
  (data as T & { updatedAt: number }).updatedAt = timestamp;
  return data;
}

export function setCompletedAt<T extends { completedAt?: number }>(data: T): T {
  (data as T & { completedAt: number }).completedAt = getCurrentTimestamp();
  return data;
}

export function setDeletedAt<T extends { deletedAt?: number }>(data: T): T {
  (data as T & { deletedAt: number }).deletedAt = getCurrentTimestamp();
  return data;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
