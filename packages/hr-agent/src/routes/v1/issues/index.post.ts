import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  CONFLICT: 409
};

interface CreateIssueBody {
  issueId: number;
  issueUrl: string;
  issueTitle: string;
  issueContent?: string;
}

export default async function createIssueRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const body = req.body as CreateIssueBody;

  if (!body.issueId || !body.issueUrl || !body.issueTitle) {
    res.json(
      new Result().error(HTTP.BAD_REQUEST, 'issueId, issueUrl, and issueTitle are required')
    );
    return;
  }

  try {
    const existingIssue = await prisma.issue.findUnique({
      where: { issueId: body.issueId }
    });

    if (existingIssue) {
      res.json(new Result().error(HTTP.CONFLICT, 'Issue with this issueId already exists'));
      return;
    }

    const issueData = setTimestamps({
      issueId: body.issueId,
      issueUrl: body.issueUrl,
      issueTitle: body.issueTitle,
      issueContent: body.issueContent ?? null,
      completedAt: -2,
      deletedAt: -2,
      createdAt: 0,
      updatedAt: 0
    });

    const issue = await prisma.issue.create({ data: issueData });

    res.json(new Result(issue));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to create issue: ${errorMessage}`)
    );
  }
}
