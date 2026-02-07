import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
};

const DOCKER_CONFIG = {
  IMAGE: process.env.DOCKER_CA_IMAGE || 'ghcr.io/eeymoo/open-hr-agent-ca:main',
  PORT: process.env.DOCKER_CA_PORT || '4096',
  BASE_PORT: (() => {
    const port = parseInt(process.env.DOCKER_BASE_PORT || '5000', 10);
    return Number.isFinite(port) && port >= 1 && port <= 65535 ? port : 5000;
  })(),
  NETWORK: process.env.DOCKER_NETWORK || 'hr-network',
  SECRET: process.env.DOCKER_CA_SECRET || ''
};

function isValidContainerName(name: string): boolean {
  if (name.length === 0 || name.length > 128) {
    return false;
  }

  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
  return validPattern.test(name);
}

const docker = new Docker();

export default async function newCARoute(req: Request, res: Response): Promise<void> {
  const { name } = req.body;

  const authHeader = req.headers['x-ca-secret'];
  if (!authHeader || authHeader !== DOCKER_CONFIG.SECRET) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'Unauthorized: invalid or missing secret'));
    return;
  }

  if (!name || typeof name !== 'string') {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'name is required and must be a string'));
    return;
  }

  if (!isValidContainerName(name)) {
    res.json(
      new Result().error(
        HTTP.BAD_REQUEST,
        'name must be a valid Docker container name: alphanumeric, underscore, hyphen, dot allowed, must start with alphanumeric, max 128 characters'
      )
    );
    return;
  }

  try {
    const containerName = `ca-${name}`;

    try {
      await docker.getNetwork(DOCKER_CONFIG.NETWORK).inspect();
    } catch {
      await docker.createNetwork({ Name: DOCKER_CONFIG.NETWORK });
    }

    const container = await docker.createContainer({
      name: containerName,
      Image: DOCKER_CONFIG.IMAGE,
      Env: [`PORT=${DOCKER_CONFIG.PORT}`, 'NODE_ENV=production'],
      HostConfig: {
        PortBindings: {
          [`${DOCKER_CONFIG.PORT}/tcp`]: [{}]
        },
        NetworkMode: DOCKER_CONFIG.NETWORK
      }
    });

    await container.start();

    const containerInfo = await container.inspect();

    const portBindings = containerInfo.NetworkSettings.Ports[`${DOCKER_CONFIG.PORT}/tcp`];
    const port = portBindings?.[0]?.HostPort || '';

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
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to create Docker container: ${errorMessage}`
      )
    );
  }
}
