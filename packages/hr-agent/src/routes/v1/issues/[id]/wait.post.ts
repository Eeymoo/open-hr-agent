import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, SOFT_DELETE_FLAG } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408
};

const DEFAULT_TIMEOUT = 120;
const POLL_INTERVAL = 2000;

interface WaitIssueBody {
  timeout?: number;
}

export default async function waitIssueRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as WaitIssueBody;

  const issueId = parseInt(Array.isArray(id) ? id[0] : id, 10);

  if (isNaN(issueId)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid issue ID'));
    return;
  }

  const timeout =
    typeof body.timeout === 'number' && body.timeout > 0 ? body.timeout : DEFAULT_TIMEOUT;

  try {
    const existingIssue = await prisma.issue.findFirst({
      where: {
        id: issueId,
        deletedAt: SOFT_DELETE_FLAG
      }
    });

    if (!existingIssue) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Issue not found'));
      return;
    }

    if (existingIssue.completedAt > SOFT_DELETE_FLAG) {
      res.json(new Result(existingIssue));
      return;
    }

    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const issue = await prisma.issue.findFirst({
        where: {
          id: issueId,
          deletedAt: SOFT_DELETE_FLAG
        }
      });

      if (!issue) {
        res.json(new Result().error(HTTP.NOT_FOUND, 'Issue not found'));
        return;
      }

      if (issue.completedAt > SOFT_DELETE_FLAG) {
        res.json(new Result(issue));
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    res.json(
      new Result().error(HTTP.REQUEST_TIMEOUT, `Issue not completed within ${timeout} seconds`)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to wait for issue: ${errorMessage}`)
    );
  }
}
