import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function getIssueByIdRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

  try {
    const issue = await prisma.issue.findFirst({
      where: {
        id: parseInt(Array.isArray(id) ? id[0] : id, 10),
        deletedAt: -2
      }
    });

    if (!issue) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Issue not found'));
      return;
    }

    res.json(new Result(issue));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch issue: ${errorMessage}`)
    );
  }
}
