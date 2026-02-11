import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { listContainers } from '../utils/docker/listContainers.js';
import { createContainer } from '../utils/docker/createContainer.js';
import { deleteContainer } from '../utils/docker/deleteContainer.js';
import { TASK_CONFIG } from '../config/taskConfig.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import type { EventBus } from './eventBus.js';

export type CAResourceStatus = 'idle' | 'busy' | 'creating' | 'error' | 'destroying';

export interface CAResource {
  id: number;
  name: string;
  containerId: string;
  status: CAResourceStatus;
  createdAt: number;
  updatedAt: number;
  currentTaskId?: number;
  issueNumber?: number;
}

export class CAResourceManager {
  private eventBus: EventBus;
  private caCache: Map<number, CAResource> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async getAllCA(): Promise<CAResource[]> {
    await this.refreshCACache();
    return Array.from(this.caCache.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async getIdleCA(): Promise<CAResource | null> {
    await this.refreshCACache();
    const idleCA = Array.from(this.caCache.values()).find((ca) => ca.status === 'idle');
    return idleCA ?? null;
  }

  async getBusyCA(): Promise<CAResource[]> {
    await this.refreshCACache();
    return Array.from(this.caCache.values()).filter((ca) => ca.status === 'busy');
  }

  async getCreatingCA(): Promise<CAResource[]> {
    await this.refreshCACache();
    return Array.from(this.caCache.values()).filter((ca) => ca.status === 'creating');
  }

  async getCAStatus(): Promise<{
    total: number;
    idle: number;
    busy: number;
    creating: number;
    error: number;
  }> {
    const allCA = await this.getAllCA();
    return {
      total: allCA.length,
      idle: allCA.filter((ca) => ca.status === 'idle').length,
      busy: allCA.filter((ca) => ca.status === 'busy').length,
      creating: allCA.filter((ca) => ca.status === 'creating').length,
      error: allCA.filter((ca) => ca.status === 'error').length
    };
  }

  async canCreateCA(): Promise<boolean> {
    const status = await this.getCAStatus();
    const hasIdleCA = status.idle > 0;
    const hasCreatingCA = status.creating > 0;
    const atMaxCapacity = status.total >= TASK_CONFIG.MAX_CA_COUNT;
    const allCAAreBusy = status.busy > 0 && status.busy === status.total;
    const hasErrorCA = status.error > 0;

    if (hasIdleCA) {
      return false;
    }

    if (hasCreatingCA) {
      return false;
    }

    if (!atMaxCapacity) {
      return true;
    }

    if (allCAAreBusy) {
      return true;
    }

    if (hasErrorCA) {
      return true;
    }

    return false;
  }

  async allocateCA(taskId: number): Promise<CAResource | null> {
    const idleCA = await this.getIdleCA();

    if (!idleCA) {
      return null;
    }

    const prisma = getPrismaClient();
    await prisma.codingAgent.update({
      where: { id: idleCA.id },
      data: { status: 'busy' }
    });

    idleCA.status = 'busy';
    idleCA.currentTaskId = taskId;
    idleCA.updatedAt = Date.now();
    this.caCache.set(idleCA.id, idleCA);

    await this.eventBus.emit(TASK_EVENTS.CA_ALLOCATED, {
      caId: idleCA.id,
      taskId
    });

    return idleCA;
  }

  async releaseCA(caId: number): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.codingAgent.update({
      where: { id: caId },
      data: { status: 'idle' }
    });

    const ca = this.caCache.get(caId);
    if (ca) {
      ca.status = 'idle';
      delete ca.currentTaskId;
      ca.updatedAt = Date.now();
      this.caCache.set(caId, ca);

      await this.eventBus.emit(TASK_EVENTS.CA_RELEASED, {
        caId,
        taskId: ca.currentTaskId
      });
    }
  }

  async createCA(issueNumber: number, taskId: number): Promise<CAResource> {
    const containerName = `${TASK_CONFIG.CA_NAME_PREFIX}${issueNumber}`;

    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    const existingCA = await prisma.codingAgent.findFirst({
      where: {
        caName: containerName,
        deletedAt: -2
      }
    });

    if (existingCA) {
      await this.destroyCA(existingCA.id);
    }

    await this.cleanupOldErrorCA();

    let caRecord;
    try {
      caRecord = await prisma.codingAgent.create({
        data: {
          caName: containerName,
          status: 'creating',
          dockerConfig: {},
          completedAt: -2,
          deletedAt: -2,
          createdAt: now,
          updatedAt: now
        }
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        const existingCAResource = await this.handleDuplicateCA(
          containerName,
          taskId,
          issueNumber
        );
        if (existingCAResource) {
          return existingCAResource;
        }
      }
      throw error;
    }

    const caResource: CAResource = {
      id: caRecord.id,
      name: containerName,
      containerId: '',
      status: 'creating',
      createdAt: now,
      updatedAt: now,
      currentTaskId: taskId,
      issueNumber
    };

    this.caCache.set(caRecord.id, caResource);

    this.createContainerAsync(containerName, caRecord.id, issueNumber);

    return caResource;
  }

  private async handleDuplicateCA(
    containerName: string,
    taskId: number,
    issueNumber: number
  ): Promise<CAResource | null> {
    const prisma = getPrismaClient();
    const caRecord = await prisma.codingAgent.findFirst({
      where: {
        caName: containerName,
        deletedAt: -2
      }
    });

    if (!caRecord) {
      return null;
    }

    if (caRecord.status === 'creating') {
      return {
        id: caRecord.id,
        name: containerName,
        containerId: caRecord.containerId ?? '',
        status: 'creating' as CAResourceStatus,
        createdAt: caRecord.createdAt,
        updatedAt: caRecord.updatedAt,
        currentTaskId: taskId,
        issueNumber
      };
    }

    await this.destroyCA(caRecord.id);
    return null;
  }

  private async createContainerAsync(
    containerName: string,
    caId: number,
    issueNumber: number
  ): Promise<void> {
    try {
      const containerId = await createContainer(containerName);

      const prisma = getPrismaClient();
      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          containerId,
          status: 'idle'
        }
      });

      const ca = this.caCache.get(caId);
      if (ca) {
        ca.containerId = containerId;
        ca.status = 'idle';
        ca.updatedAt = Date.now();
        this.caCache.set(caId, ca);
      }

      await this.eventBus.emit(TASK_EVENTS.CA_CREATED, {
        caId,
        containerId,
        issueNumber
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const prisma = getPrismaClient();
      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          status: 'error'
        }
      });

      const ca = this.caCache.get(caId);
      if (ca) {
        ca.status = 'error';
        ca.updatedAt = Date.now();
        this.caCache.set(caId, ca);
      }

      await this.eventBus.emit(TASK_EVENTS.CA_ERROR, {
        caId,
        error: errorMessage,
        issueNumber
      });
    }
  }

  async destroyCA(caId: number): Promise<void> {
    const prisma = getPrismaClient();
    const caRecord = await prisma.codingAgent.findUnique({
      where: { id: caId }
    });

    if (!caRecord) {
      return;
    }

    if (caRecord.containerId) {
      await deleteContainer(caRecord.containerId);
    }

    await prisma.codingAgent.update({
      where: { id: caId },
      data: {
        status: 'destroyed',
        containerId: null
      }
    });

    this.caCache.delete(caId);

    await this.eventBus.emit(TASK_EVENTS.CA_DESTROYED, {
      caId,
      caName: caRecord.caName
    });
  }

  private async cleanupOldErrorCA(): Promise<void> {
    const allCA = await this.getAllCA();
    const errorCA = allCA.filter((ca) => ca.status === 'error');

    const totalCount = allCA.length;
    const errorCount = errorCA.length;

    if (totalCount <= TASK_CONFIG.MAX_CA_COUNT || errorCount === 0) {
      return;
    }

    const sortedErrorCA = errorCA.sort((a, b) => a.createdAt - b.createdAt);
    const [oldestErrorCA] = sortedErrorCA;

    if (oldestErrorCA) {
      await this.destroyCA(oldestErrorCA.id);
    }
  }

  private async refreshCACache(): Promise<void> {
    const prisma = getPrismaClient();
    const caRecords = await prisma.codingAgent.findMany({
      where: {
        status: { not: 'destroyed' },
        deletedAt: -2
      }
    });

    const dockerContainers = await listContainers();
    const dockerContainerMap = new Map(
      dockerContainers.map((dc) => [dc.names[0].replace('/', ''), dc])
    );

    this.caCache.clear();

    for (const caRecord of caRecords) {
      const dockerContainer = dockerContainerMap.get(caRecord.caName);

      let status: CAResourceStatus = caRecord.status as CAResourceStatus;

      if ((status === 'idle' || status === 'creating') && !dockerContainer?.state) {
        status = 'error';
      }

      this.caCache.set(caRecord.id, {
        id: caRecord.id,
        name: caRecord.caName,
        containerId: caRecord.containerId ?? '',
        status,
        createdAt: caRecord.createdAt,
        updatedAt: caRecord.updatedAt,
        currentTaskId: undefined,
        issueNumber: parseInt(caRecord.caName.replace(TASK_CONFIG.CA_NAME_PREFIX, ''), 10)
      });
    }
  }
}
