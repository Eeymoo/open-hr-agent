import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient } from '../../../../utils/database.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function getCAByIdRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

  try {
    const ca = await prisma.codingAgent.findFirst({
      where: {
        id: parseInt(Array.isArray(id) ? id[0] : id, 10),
        deletedAt: -2
      }
    });

    if (!ca) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'CA not found'));
      return;
    }

    res.json(new Result(ca));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch CA: ${errorMessage}`));
  }
}
