import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../utils/database.js';
import { DOCKER_CONFIG } from '../../../config/docker.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
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
  const prisma = getPrismaClient();

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
        Binds: ['/var/run/docker.sock:/var/​run/docker.sock:rw'],
        NetworkMode: DOCKER_CONFIG.NETWORK
      }
    });

    await container.start();

    await docker.getNetwork(DOCKER_CONFIG.HR_NETWORK).connect({ Container: containerName });

    const containerInfo = await container.inspect();

    const portBindings = containerInfo.NetworkSettings.Ports[`${DOCKER_CONFIG.PORT}/tcp`];
    const port = portBindings?.[0]?.HostPort ?? '';

    const caData = setTimestamps({
      caName: name,
      containerId: containerInfo.Id,
      status: 'running',
      dockerConfig: {
        port,
        image: DOCKER_CONFIG.IMAGE,
        network: DOCKER_CONFIG.NETWORK
      },
      createdAt: 0,
      updatedAt: 0,
      completedAt: -2,
      deletedAt: -2
    });

    const caRecord = await prisma.codingAgent.create({ data: caData });

    res.json(
      new Result({
        name,
        containerId: containerInfo.Id,
        containerName,
        port,
        image: DOCKER_CONFIG.IMAGE,
        network: DOCKER_CONFIG.NETWORK,
        hrNetwork: DOCKER_CONFIG.HR_NETWORK,
        internalUrl: `${containerName}:${DOCKER_CONFIG.PORT}`,
        databaseId: caRecord.id,
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
