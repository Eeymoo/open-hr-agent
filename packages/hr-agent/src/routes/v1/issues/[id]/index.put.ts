import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

interface UpdateIssueBody {
  issueUrl?: string;
  issueTitle?: string;
  issueContent?: string;
}

export default async function updateIssueRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as UpdateIssueBody;

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

    const updateData: Record<string, unknown> = {};
    if (body.issueUrl !== undefined) {
      updateData.issueUrl = body.issueUrl;
    }
    if (body.issueTitle !== undefined) {
      updateData.issueTitle = body.issueTitle;
    }
    if (body.issueContent !== undefined) {
      updateData.issueContent = body.issueContent;
    }

    if (Object.keys(updateData).length === 0) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No fields to update'));
      return;
    }

    const issue = await prisma.issue.update({
      where: { id: idValue },
      data: setTimestamps(updateData as { updatedAt: number }, true)
    });

    res.json(new Result(issue));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to update issue: ${errorMessage}`)
    );
  }
}
