import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

interface UpdateCABody {
  status?: string;
  dockerConfig?: Record<string, unknown>;
}

export default async function updateCARoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as UpdateCABody;

  try {
    const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const existingCA = await prisma.codingAgent.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      }
    });

    if (!existingCA) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'CA not found'));
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.dockerConfig !== undefined) {
      updateData.dockerConfig = body.dockerConfig as unknown;
    }

    if (Object.keys(updateData).length === 0) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No fields to update'));
      return;
    }

    const ca = await prisma.codingAgent.update({
      where: { id: idValue },
      data: setTimestamps({ ...updateData, updatedAt: 0 } as { updatedAt: number }, true)
    });

    res.json(new Result(ca));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to update CA: ${errorMessage}`));
  }
}
