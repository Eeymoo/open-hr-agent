import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500
};

export default async function getCAsRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const rawPage = Number(req.query.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(req.query.pageSize);
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : 10;
  const allowedOrderByFields = ['createdAt', 'updatedAt', 'caName', 'status'];
  const orderBy = allowedOrderByFields.includes(req.query.orderBy as string)
    ? (req.query.orderBy as string)
    : 'createdAt';
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
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch CAs: ${errorMessage}`)
    );
  }
}
