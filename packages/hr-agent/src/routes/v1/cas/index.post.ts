import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  CONFLICT: 409
};

interface CreateCABody {
  caName: string;
  status?: string;
  dockerConfig?: unknown;
}

export default async function createCodingAgentRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const body = req.body as CreateCABody;

  if (!body.caName) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'caName is required'));
    return;
  }

  try {
    const existingCA = await prisma.codingAgent.findUnique({
      where: { caName: body.caName }
    });

    if (existingCA) {
      res.json(new Result().error(HTTP.CONFLICT, 'Coding agent with this caName already exists'));
      return;
    }

    const caData = setTimestamps({
      caName: body.caName,
      containerId: null,
      status: body.status ?? 'pending',
      dockerConfig: body.dockerConfig ?? undefined,
      completedAt: -2,
      deletedAt: -2,
      createdAt: 0,
      updatedAt: 0
    });

    const ca = await prisma.codingAgent.create({ data: caData });

    res.json(new Result(ca));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to create coding agent: ${errorMessage}`
      )
    );
  }
}
