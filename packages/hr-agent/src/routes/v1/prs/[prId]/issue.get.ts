import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, SOFT_DELETE_FLAG } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function getPRIssueRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { prId } = req.params;
  const parsedPrId = parseInt(prId as string, 10);

  if (Number.isNaN(parsedPrId)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid PR ID'));
    return;
  }

  try {
    const issuePr = await prisma.issuePR.findFirst({
      where: {
        prId: parsedPrId,
        issue: { deletedAt: SOFT_DELETE_FLAG },
        pr: { deletedAt: SOFT_DELETE_FLAG }
      },
      include: {
        issue: true
      }
    });

    if (!issuePr) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'No issue found for this PR'));
      return;
    }

    res.json(new Result(issuePr.issue));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch PR issue: ${errorMessage}`)
    );
  }
}
