import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  CONFLICT: 409
};

interface CreatePRBody {
  prId: number;
  prTitle: string;
  prContent?: string;
  prUrl: string;
  issueId?: number;
}

export default async function createPRRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const body = req.body as CreatePRBody;

  if (!body.prId || !body.prTitle || !body.prUrl) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'prId, prTitle, and prUrl are required'));
    return;
  }

  try {
    const existingPR = await prisma.pullRequest.findUnique({
      where: { prId: body.prId }
    });

    if (existingPR) {
      res.json(new Result().error(HTTP.CONFLICT, 'PR with this prId already exists'));
      return;
    }

    const prData = setTimestamps({
      prId: body.prId,
      prTitle: body.prTitle,
      prContent: body.prContent ?? null,
      prUrl: body.prUrl,
      issueId: body.issueId ?? null,
      completedAt: -2,
      deletedAt: -2,
      createdAt: 0,
      updatedAt: 0
    });

    const pr = await prisma.pullRequest.create({ data: prData });

    res.json(new Result(pr));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to create PR: ${errorMessage}`)
    );
  }
}
