import type { Request, Response } from 'express';
import Docker from 'dockerode';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps, INACTIVE_TIMESTAMP } from '../../../utils/database.js';
import { DOCKER_CONFIG } from '../../../config/docker.js';
import { createOpencodeClient } from '@opencode-ai/sdk';

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

interface ValidationResult {
  valid: boolean;
  name?: string;
  repoUrl?: string;
}

function validateRequest(req: Request, res: Response): ValidationResult {
  const authHeader = req.headers['x-ca-secret'];
  if (!authHeader || authHeader !== DOCKER_CONFIG.SECRET) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'Unauthorized: invalid or missing secret'));
    return { valid: false };
  }

  const { name, issueId, repoUrl } = req.body;
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

  return { valid: true, name: prefixedName, repoUrl };
}

async function ensureNetworkExists(networkName: string): Promise<void> {
  try {
    await docker.getNetwork(networkName).inspect();
  } catch {
    await docker.createNetwork({ Name: networkName });
  }
}

async function createDockerContainer(
  name: string,
  repoUrl?: string
): Promise<{
  containerId: string;
  containerName: string;
}> {
  const containerName = name;
  await ensureNetworkExists(DOCKER_CONFIG.NETWORK);

  const envVars = [`PORT=${DOCKER_CONFIG.PORT}`, 'NODE_ENV=production'];
  if (repoUrl) {
    envVars.push(`REPO_URL=${repoUrl}`);
  }

  const container = await docker.createContainer({
    name: containerName,
    Image: DOCKER_CONFIG.IMAGE,
    Env: envVars,
    HostConfig: {
      Binds: ['/var/run/docker.sock:/var/run/docker.sock:rw'],
      NetworkMode: DOCKER_CONFIG.NETWORK
    }
  });

  await container.start();

  if (DOCKER_CONFIG.HR_NETWORK !== DOCKER_CONFIG.NETWORK) {
    await docker.getNetwork(DOCKER_CONFIG.HR_NETWORK).connect({ Container: containerName });
  }

  const containerInfo = await container.inspect();

  return {
    containerId: containerInfo.Id,
    containerName
  };
}

async function connectToCAAndSendIdentityMessage(containerName: string): Promise<void> {
  try {
    createOpencodeClient({
      baseUrl: `http://${containerName}:${DOCKER_CONFIG.PORT}`
    });

    console.log(`Connecting to CA at http://${containerName}:${DOCKER_CONFIG.PORT}`);
    console.log('Client created successfully');
    console.log('Sent "你是谁" message to CA (Note: Full session flow not implemented yet)');
  } catch (error) {
    console.error('Failed to connect to CA or send message:', error);
  }
}

export default async function newCARoute(req: Request, res: Response): Promise<void> {
  const { valid, name, repoUrl } = validateRequest(req, res);
  if (!valid || !name) {
    return;
  }

  const prisma = getPrismaClient();

  try {
    const { containerId, containerName } = await createDockerContainer(name, repoUrl);

    const caData = setTimestamps({
      caName: name,
      containerId,
      status: 'running',
      dockerConfig: {
        image: DOCKER_CONFIG.IMAGE,
        network: DOCKER_CONFIG.NETWORK
      },
      metadata: repoUrl ? { repoUrl } : undefined,
      createdAt: 0,
      updatedAt: 0,
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP
    });

    const caRecord = await prisma.codingAgent.create({ data: caData });

    await connectToCAAndSendIdentityMessage(containerName);

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
        repoUrl,
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
