import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

export default async function getTasksRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const rawPage = Number(req.query.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(req.query.pageSize);
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : 10;
  const orderBy = (req.query.orderBy as string) ?? 'createdAt';
  const status = req.query.status as string;
  const priority = req.query.priority ? parseInt(req.query.priority as string, 10) : undefined;
  const type = req.query.type as string;
  const issueId = req.query.issueId ? parseInt(req.query.issueId as string, 10) : undefined;
  const prId = req.query.prId ? parseInt(req.query.prId as string, 10) : undefined;
  const caId = req.query.caId ? parseInt(req.query.caId as string, 10) : undefined;

  try {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = {
      deletedAt: -2,
      ...(status && { status }),
      ...(priority !== undefined && { priority }),
      ...(type && { type }),
      ...(issueId && { issueId }),
      ...(prId && { prId }),
      ...(caId && { caId })
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { [orderBy]: 'desc' }
      }),
      prisma.task.count({ where })
    ]);

    res.json(
      new Result({
        tasks,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch tasks: ${errorMessage}`)
    );
  }
}
