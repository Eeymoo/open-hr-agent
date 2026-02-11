import { getPrismaClient, setTimestamps } from '../utils/database.js';

export interface CreateCALogParams {
  caId: number;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: unknown | null;
}

export async function createCALog(
  caId: number,
  action: string,
  oldValue?: string | null,
  newValue?: string | null,
  metadata?: unknown | null
): Promise<void> {
  const prisma = getPrismaClient();
  const logData = setTimestamps({
    caId,
    action,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    metadata: metadata ?? undefined,
    createdAt: 0,
    updatedAt: 0
  });
  await prisma.codingAgentLog.create({ data: logData });
}

export async function getCALogs(caId: number, limit = 50): Promise<unknown[]> {
  const prisma = getPrismaClient();
  const logs = await prisma.codingAgentLog.findMany({
    where: { caId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  return logs;
}
