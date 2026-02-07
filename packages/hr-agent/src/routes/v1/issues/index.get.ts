import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, SOFT_DELETE_FLAG } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

const DEFAULT_PAGE_SIZE = 10;

export default async function getIssuesRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const rawPage = Number(req.query.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(req.query.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE;
  const allowedOrderByFields = ['createdAt', 'updatedAt', 'issueTitle', 'status'];
  const orderBy = allowedOrderByFields.includes(req.query.orderBy as string)
    ? (req.query.orderBy as string)
    : 'createdAt';

  try {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where: { deletedAt: SOFT_DELETE_FLAG },
        skip,
        take,
        orderBy: { [orderBy]: 'desc' }
      }),
      prisma.issue.count({ where: { deletedAt: SOFT_DELETE_FLAG } })
    ]);

    res.json(
      new Result({
        issues,
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
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch issues: ${errorMessage}`)
    );
  }
}
