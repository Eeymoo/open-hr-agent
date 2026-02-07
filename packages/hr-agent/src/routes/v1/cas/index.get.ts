import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500
};

export default async function getCAsRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const page = parseInt(req.query.page as string, 10) ?? 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) ?? 10;
  const orderBy = (req.query.orderBy as string) ?? 'createdAt';
  const status = req.query.status as string;

  try {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = {
      deletedAt: -2,
      ...(status && { status })
    };

    const [cas, total] = await Promise.all([
      prisma.codingAgent.findMany({
        where,
        skip,
        take,
        orderBy: { [orderBy]: 'desc' }
      }),
      prisma.codingAgent.count({ where })
    ]);

    res.json(
      new Result({
        cas,
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
    res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch CAs: ${errorMessage}`));
  }
}
