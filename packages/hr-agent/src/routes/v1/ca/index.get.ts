import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
};

const DOCKER_CONFIG = {
  SECRET: process.env.DOCKER_CA_SECRET || ''
};

const docker = new Docker();

export default async function listCARoute(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers['x-ca-secret'];
  if (!authHeader || authHeader !== DOCKER_CONFIG.SECRET) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'Unauthorized: invalid or missing secret'));
    return;
  }

  try {
    const containers = await docker.listContainers({ all: true });

    const caContainers = containers
      .filter((container) => container.Names.some((name) => name.startsWith('/ca-')))
      .map((container) => ({
        name: container.Names[0]?.replace('/ca-', '') || '',
        containerId: container.Id,
        containerName: container.Names[0]?.replace('/', '') || '',
        image: container.Image,
        status: container.Status,
        state: container.State,
        created: container.Created
      }));

    res.json(
      new Result({
        total: caContainers.length,
        containers: caContainers
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to list Docker containers: ${errorMessage}`
      )
    );
  }
}
