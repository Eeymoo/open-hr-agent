import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setDeletedAt } from '../../../utils/database.js';
import { createCALog } from '../../../services/caLogger.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function deleteCodingAgentRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

  try {
    const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const existingCA = await prisma.codingAgent.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      }
    });

    if (!existingCA) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Coding agent not found'));
      return;
    }

    const ca = await prisma.codingAgent.update({
      where: { id: idValue },
      data: setDeletedAt({ deletedAt: 0 })
    });

    await createCALog(
      ca.id,
      'DELETE',
      JSON.stringify({
        caName: ca.caName,
        status: ca.status,
        containerId: ca.containerId
      }),
      null
    );

    res.json(new Result(ca));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to delete coding agent: ${errorMessage}`
      )
    );
  }
}
