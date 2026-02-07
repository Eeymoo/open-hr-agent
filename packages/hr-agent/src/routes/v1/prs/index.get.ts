import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function getPRsRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const page = parseInt(req.query.page as string, 10) ?? 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) ?? 10;
  const orderBy = (req.query.orderBy as string) ?? 'createdAt';
  const issueId = req.query.issueId ? parseInt(req.query.issueId as string, 10) : undefined;

  try {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = {
      deletedAt: -2,
      ...(issueId && { issueId })
    };

    const [prs, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        skip,
        take,
        orderBy: { [orderBy]: 'desc' }
      }),
      prisma.pullRequest.count({ where })
    ]);

    res.json(
      new Result({
        prs,
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
    res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch PRs: ${errorMessage}`));
  }
}
