import type { Request, Response } from 'express';
import Result from '../../../../../utils/Result.js';
import { getPrismaClient, SOFT_DELETE_FLAG } from '../../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function getIssuePRsRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { issueId } = req.params;
  const parsedIssueId = parseInt(issueId as string, 10);

  if (Number.isNaN(parsedIssueId)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid issue ID'));
    return;
  }

  try {
    const issuePrs = await prisma.issuePR.findMany({
      where: {
        issueId: parsedIssueId,
        issue: { deletedAt: SOFT_DELETE_FLAG },
        pr: { deletedAt: SOFT_DELETE_FLAG }
      },
      include: {
        pr: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(new Result(issuePrs.map((ip) => ip.pr)));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch issue PRs: ${errorMessage}`)
    );
  }
}
