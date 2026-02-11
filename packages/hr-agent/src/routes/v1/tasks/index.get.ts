import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, SOFT_DELETE_FLAG } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_ORDER_BY_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status', 'type'] as const;

/**
 * 解析查询参数
 * @param req - Express 请求对象
 * @returns 解析后的查询参数
 */
function parseQueryParams(req: Request): {
  page: number;
  pageSize: number;
  orderBy: string;
  status?: string;
  priority?: number;
  type?: string;
  issueId?: number;
  prId?: number;
  caId?: number;
} {
  const rawPage = Number(req.query.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(req.query.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE;
  const rawOrderBy = req.query.orderBy as string;
  const orderBy = ALLOWED_ORDER_BY_FIELDS.includes(rawOrderBy as (typeof ALLOWED_ORDER_BY_FIELDS)[number])
    ? rawOrderBy
    : 'createdAt';

  return {
    page,
    pageSize,
    orderBy,
    status: req.query.status as string,
    priority: req.query.priority ? parseInt(req.query.priority as string, 10) : undefined,
    type: req.query.type as string,
    issueId: req.query.issueId ? parseInt(req.query.issueId as string, 10) : undefined,
    prId: req.query.prId ? parseInt(req.query.prId as string, 10) : undefined,
    caId: req.query.caId ? parseInt(req.query.caId as string, 10) : undefined
  };
}

/**
 * 构建查询条件
 * @param params - 解析后的查询参数
 * @returns Prisma 查询条件对象
 */
function buildWhereClause(params: ReturnType<typeof parseQueryParams>): Record<string, unknown> {
  return {
    deletedAt: SOFT_DELETE_FLAG,
    ...(params.status && { status: params.status }),
    ...(params.priority !== undefined && { priority: params.priority }),
    ...(params.type && { type: params.type }),
    ...(params.issueId && { issueId: params.issueId }),
    ...(params.prId && { prId: params.prId }),
    ...(params.caId && { caId: params.caId })
  };
}

/**
 * GET /v1/tasks - 获取任务列表路由
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 */
export default async function getTasksRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const params = parseQueryParams(req);

  try {
    const skip = (params.page - 1) * params.pageSize;
    const where = buildWhereClause(params);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: params.pageSize,
        orderBy: { [params.orderBy]: 'desc' }
      }),
      prisma.task.count({ where })
    ]);

    res.json(
      new Result({
        tasks,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.ceil(total / params.pageSize)
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
