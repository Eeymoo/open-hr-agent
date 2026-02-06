import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';

const HTTP_STATUS_CODE = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

const DOCKER_CONFIG = {
  IMAGE: process.env.DOCKER_CA_IMAGE || 'ghcr.io/eeymoo/open-hr-agent-ca:main',
  PORT: process.env.DOCKER_CA_PORT || '4096',
  BASE_PORT: parseInt(process.env.DOCKER_BASE_PORT || '5000', 10),
  NETWORK: process.env.DOCKER_NETWORK || 'hr-network'
};

const docker = new Docker();

export default async function newCARoute(req: Request, res: Response): Promise<void> {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    res.json(new Result().error(HTTP_STATUS_CODE.BAD_REQUEST, 'name is required and must be a string'));
    return;
  }

  try {
    const containerName = `ca-${name}`;
    const port = DOCKER_CONFIG.BASE_PORT + (Date.now() % 1000);

    try {
      await docker.getNetwork(DOCKER_CONFIG.NETWORK).inspect();
    } catch {
      await docker.createNetwork({ Name: DOCKER_CONFIG.NETWORK });
    }

    const container = await docker.createContainer({
      name: containerName,
      Image: DOCKER_CONFIG.IMAGE,
      Env: [
        `PORT=${DOCKER_CONFIG.PORT}`,
        'NODE_ENV=production'
      ],
      HostConfig: {
        PortBindings: {
          [`${DOCKER_CONFIG.PORT}/tcp`]: [{ HostPort: port.toString() }]
        },
        NetworkMode: DOCKER_CONFIG.NETWORK
      }
    });

    await container.start();

    const containerInfo = await container.inspect();

    res.json(
      new Result({
        name,
        containerId: containerInfo.Id,
        containerName,
        port,
        image: DOCKER_CONFIG.IMAGE,
        network: DOCKER_CONFIG.NETWORK,
        message: 'Docker container created successfully'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
        `Failed to create Docker container: ${errorMessage}`
      )
    );
  }
}
