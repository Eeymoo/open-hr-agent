import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function softDeleteFilter(): { deletedAt: number } {
  return { deletedAt: -2 };
}

export function setTimestamps<T extends { createdAt?: number; updatedAt?: number }>(
  data: T,
  isUpdate: boolean = false
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
