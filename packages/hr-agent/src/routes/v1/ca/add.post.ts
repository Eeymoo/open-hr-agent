import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps, INACTIVE_TIMESTAMP } from '../../../utils/database.js';
import { DOCKER_CONFIG } from '../../../config/docker.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
};

const MAX_CONTAINER_NAME_LENGTH = 128;
const docker = new Docker();

function isValidContainerName(name: string): boolean {
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
  return name.length > 0 && name.length <= MAX_CONTAINER_NAME_LENGTH && validPattern.test(name);
}

function validateRequest(
  req: Request,
  res: Response
): { valid: boolean; name?: string } {
  const authHeader = req.headers['x-ca-secret'];
  if (!authHeader || authHeader !== DOCKER_CONFIG.SECRET) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'Unauthorized: invalid or missing secret'));
    return { valid: false };
  }

  const { name, issueId } = req.body;
  let containerName = name;

  if (!containerName) {
    if (issueId !== undefined && issueId !== null) {
      containerName = String(issueId);
    } else {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'name or issueId is required'));
      return { valid: false };
    }
  }

  if (typeof containerName !== 'string') {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'name or issueId must be a string'));
    return { valid: false };
  }

  const prefixedName = `${DOCKER_CONFIG.NAME_PREFIX}${containerName}`;

  if (!isValidContainerName(prefixedName)) {
    res.json(
      new Result().error(
        HTTP.BAD_REQUEST,
        'name must be a valid Docker container name: alphanumeric, underscore, hyphen, dot allowed, must start with alphanumeric, max 128 characters'
      )
    );
    return { valid: false };
  }

  return { valid: true, name: prefixedName };
}

async function ensureNetworkExists(networkName: string): Promise<void> {
  try {
    await docker.getNetwork(networkName).inspect();
  } catch {
    await docker.createNetwork({ Name: networkName });
  }
}

async function createDockerContainer(name: string): Promise<{
  containerId: string;
  containerName: string;
}> {
  const containerName = `ca-${name}`;

  await ensureNetworkExists(DOCKER_CONFIG.NETWORK);

  const container = await docker.createContainer({
    name: containerName,
    Image: DOCKER_CONFIG.IMAGE,
    Env: [`PORT=${DOCKER_CONFIG.PORT}`, 'NODE_ENV=production'],
    HostConfig: {
      Binds: ['/var/run/docker.sock:/var/run/docker.sock:rw'],
      NetworkMode: DOCKER_CONFIG.NETWORK
    }
  });

  await container.start();

  await docker.getNetwork(DOCKER_CONFIG.HR_NETWORK).connect({ Container: containerName });

  const containerInfo = await container.inspect();

  return {
    containerId: containerInfo.Id,
    containerName
  };
}

export default async function newCARoute(req: Request, res: Response): Promise<void> {
  const { valid, name } = validateRequest(req, res);
  if (!valid || !name) {
    return;
  }

  const prisma = getPrismaClient();

  try {
    const { containerId, containerName } = await createDockerContainer(name);

    const caData = setTimestamps({
      caName: name,
      containerId,
      status: 'running',
      dockerConfig: {
        image: DOCKER_CONFIG.IMAGE,
        network: DOCKER_CONFIG.NETWORK
      },
      createdAt: 0,
      updatedAt: 0,
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP
    });

    const caRecord = await prisma.codingAgent.create({ data: caData });

    res.json(
      new Result({
        name,
        containerId,
        containerName,
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
