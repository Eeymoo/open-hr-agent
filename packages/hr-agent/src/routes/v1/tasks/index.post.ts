import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, getCurrentTimestamp } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

interface CreateTaskBody {
  type: string;
  status?: string;
  priority?: number;
  issueId?: number;
  prId?: number;
  caId?: number;
  metadata?: Record<string, unknown>;
}

export default async function createTaskRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const body = req.body as CreateTaskBody;

  if (!body.type) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'type is required'));
    return;
  }

  try {
    const now = getCurrentTimestamp();
    const taskData = {
      type: body.type,
      status: body.status ?? 'planned',
      priority: body.priority ?? 0,
      issueId: body.issueId ?? null,
      prId: body.prId ?? null,
      caId: body.caId ?? null,
      completedAt: -2,
      deletedAt: -2,
      createdAt: now,
      updatedAt: now
    };

    const task = await prisma.task.create({ data: taskData });

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to create task: ${errorMessage}`)
    );
  }
}
