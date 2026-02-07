import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';
import { getDockerCASecret } from '../../../utils/secretManager.js';

const HTTP = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
};

const docker = new Docker();

export default async function updateCARoute(req: Request, res: Response): Promise<void> {
  const { name } = req.params;
  const { restart } = req.body;

  const authHeader = req.headers['x-ca-secret'];
  if (!authHeader || authHeader !== getDockerCASecret()) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'Unauthorized: invalid or missing secret'));
    return;
  }

  if (!name || typeof name !== 'string') {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'name is required and must be a string'));
    return;
  }

  const containerName = `ca-${name}`;

  try {
    const container = docker.getContainer(containerName);

    try {
      await container.inspect();
    } catch {
      res.json(new Result().error(HTTP.NOT_FOUND, `Container ${containerName} not found`));
      return;
    }

    if (restart === true) {
      await container.restart();
    }

    const containerInfo = await container.inspect();

    res.json(
      new Result({
        name,
        containerId: containerInfo.Id,
        containerName,
        status: containerInfo.State.Status,
        message: 'Docker container updated successfully'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to update Docker container: ${errorMessage}`
      )
    );
  }
}
