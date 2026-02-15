import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

interface UpdatePRBody {
  prTitle?: string;
  prContent?: string;
  issueId?: number;
}

export default async function updatePRRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as UpdatePRBody;

  try {
    const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const existingPR = await prisma.pullRequest.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      }
    });

    if (!existingPR) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'PR not found'));
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.prTitle !== undefined) {
      updateData.prTitle = body.prTitle;
    }
    if (body.prContent !== undefined) {
      updateData.prContent = body.prContent;
    }
    if (body.issueId !== undefined) {
      updateData.issueId = body.issueId;
    }

    if (Object.keys(updateData).length === 0) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No fields to update'));
      return;
    }

    const pr = await prisma.pullRequest.update({
      where: { id: idValue },
      data: setTimestamps(updateData as { updatedAt: number }, true)
    });

    res.json(new Result(pr));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to update PR: ${errorMessage}`)
    );
  }
}
