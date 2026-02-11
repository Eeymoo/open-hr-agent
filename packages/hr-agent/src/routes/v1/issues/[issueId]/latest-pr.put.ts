import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, SOFT_DELETE_FLAG } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function updateIssueLatestPRRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { issueId } = req.params;
  const parsedIssueId = parseInt(issueId as string, 10);

  const { prId } = req.body;
  const parsedPrId = typeof prId === 'number' ? prId : parseInt(prId as string, 10);

  if (Number.isNaN(parsedIssueId)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid issue ID'));
    return;
  }

  if (Number.isNaN(parsedPrId)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid PR ID'));
    return;
  }

  try {
    const issue = await prisma.issue.findFirst({
      where: { id: parsedIssueId, deletedAt: SOFT_DELETE_FLAG }
    });

    if (!issue) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Issue not found'));
      return;
    }

    const pr = await prisma.pullRequest.findFirst({
      where: { id: parsedPrId, deletedAt: SOFT_DELETE_FLAG }
    });

    if (!pr) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'PR not found'));
      return;
    }

    const existingIssuePr = await prisma.issuePR.findUnique({
      where: {
        issueId_prId: {
          issueId: parsedIssueId,
          prId: parsedPrId
        }
      }
    });

    if (existingIssuePr) {
      res.json(new Result(existingIssuePr, 200, 'PR already associated with issue'));
      return;
    }

    const issuePr = await prisma.issuePR.create({
      data: {
        issueId: parsedIssueId,
        prId: parsedPrId
      }
    });

    res.json(new Result(issuePr, 201, 'PR associated with issue successfully'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to associate PR with issue: ${errorMessage}`
      )
    );
  }
}
