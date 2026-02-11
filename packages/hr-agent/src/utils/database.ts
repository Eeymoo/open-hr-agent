import { PrismaClient } from '@prisma/client';
import { getEnvValue } from './envSecrets.js';

/** 时间戳转换除数：毫秒转秒 */
const TIMESTAMP_DIVISOR = 1000;
/** 软删除标记值 */
const SOFT_DELETE_FLAG = -2;
/** 非活跃时间戳标记 */
const INACTIVE_TIMESTAMP = -2;

/** Prisma 客户端单例 */
let prismaClient: PrismaClient | null = null;

export { SOFT_DELETE_FLAG, INACTIVE_TIMESTAMP, TIMESTAMP_DIVISOR };

/**
 * 获取 Prisma 客户端实例（单例模式）
 * @returns PrismaClient 实例
 */
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

/**
 * 获取当前时间戳（秒级）
 * @returns Unix 时间戳（秒）
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / TIMESTAMP_DIVISOR);
}

/**
 * 获取软删除过滤条件
 * @returns 包含软删除标记的过滤对象
 */
export function softDeleteFilter(): { deletedAt: number } {
  return { deletedAt: SOFT_DELETE_FLAG };
}

/**
 * 设置数据对象的创建和更新时间戳
 * @template T - 数据类型
 * @param data - 需要设置时间戳的数据对象
 * @param isUpdate - 是否为更新操作，默认为 false
 * @returns 包含时间戳的数据对象
 */
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

/**
 * 设置对象的完成时间戳
 * @template T - 数据类型
 * @param data - 需要设置完成时间的数据对象
 * @returns 包含完成时间戳的数据对象
 */
export function setCompletedAt<T extends { completedAt?: number }>(data: T): T {
  (data as T & { completedAt: number }).completedAt = getCurrentTimestamp();
  return data;
}

/**
 * 设置对象的删除时间戳（软删除）
 * @template T - 数据类型
 * @param data - 需要设置删除时间的数据对象
 * @returns 包含删除时间戳的数据对象
 */
export function setDeletedAt<T extends { deletedAt?: number }>(data: T): T {
  (data as T & { deletedAt: number }).deletedAt = getCurrentTimestamp();
  return data;
}

/**
 * 断开 Prisma 数据库连接
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
