import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps, INACTIVE_TIMESTAMP } from '../../../utils/database.js';
import { DOCKER_CONFIG } from '../../../config/docker.js';
import { CONTAINER_TASK_PRIORITIES } from '../../../config/taskPriorities.js';

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
};

const MAX_CONTAINER_NAME_LENGTH = 128;

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

export default async function newCARoute(req: Request, res: Response): Promise<void> {
  const { valid, name, repoUrl } = validateRequest(req, res);
  if (!valid || !name) {
    return;
  }

  const prisma = getPrismaClient();

  try {
    const existingCA = await prisma.codingAgent.findFirst({
      where: {
        caName: name,
        deletedAt: -2
      }
    });

    if (existingCA) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'Coding agent with this name already exists'));
      return;
    }

    const caData = setTimestamps({
      caName: name,
      containerId: null,
      status: 'pending_create',
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

    const manager = global.taskManager;
    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const taskId = await manager.run(
      'container_create',
      {
        caId: caRecord.id,
        caName: name
      },
      CONTAINER_TASK_PRIORITIES.CREATE
    );

    res.json(
      new Result({
        name,
        containerName: name,
        taskId,
        databaseId: caRecord.id,
        status: 'pending_create',
        repoUrl,
        message: 'Container creation task queued'
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
