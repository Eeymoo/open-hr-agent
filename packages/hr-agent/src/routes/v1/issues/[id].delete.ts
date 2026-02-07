import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setDeletedAt } from '../../../utils/database.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function deleteIssueRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

  try {
    const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const existingIssue = await prisma.issue.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      }
    });

    if (!existingIssue) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Issue not found'));
      return;
    }

    const issue = await prisma.issue.update({
      where: { id: idValue },
      data: setDeletedAt({ deletedAt: 0 })
    });

    res.json(new Result(issue));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to delete issue: ${errorMessage}`)
    );
  }
}
