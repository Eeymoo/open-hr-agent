import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { listContainers, type ContainerInfo } from '../utils/docker/listContainers.js';

interface SyncResult {
  synced: boolean;
  inconsistency: boolean;
  error: boolean;
}

export class ContainerSyncTask extends BaseTask {
  readonly name = 'container_sync';
  readonly dependencies: string[] = [];
  readonly tags = [TASK_TAGS.MANAGES_CA];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    const { caId, caName } = (params as { caId?: number; caName?: string }) ?? {};
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    await this.logger.info(context.taskId, this.name, '开始容器状态同步', { caId, caName });

    await this.emitTaskEvent(TASK_EVENTS.CONTAINER_SYNCING, { caId, caName });

    try {
      const dockerContainers = await listContainers();
      const dockerContainerMap = new Map(
        dockerContainers.map((dc) => [dc.names[0].replace('/', ''), dc])
      );

      const syncedCount = 0;
      const inconsistenciesFound = 0;
      const errorCount = 0;

      if (caId && caName) {
        const result = await this.syncSingleCA(caId, caName, dockerContainerMap, prisma, now);
        this.updateSyncStats(result, { syncedCount, inconsistenciesFound, errorCount });
      } else {
        const caRecords = await prisma.codingAgent.findMany({
          where: {
            deletedAt: -2,
            status: {
              notIn: [
                'destroyed',
                'pending_create',
                'pending_delete',
                'pending_start',
                'pending_stop',
                'pending_restart',
                'pending_update'
              ]
            }
          }
        });

        await this.syncAllCA(caRecords, dockerContainerMap, prisma, now, {
          syncedCount,
          inconsistenciesFound,
          errorCount
        });
      }

      await this.logger.info(context.taskId, this.name, '容器状态同步完成', {
        syncedCount,
        inconsistenciesFound,
        errorCount
      });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_SYNCED, {
        caId,
        caName,
        syncedCount,
        inconsistenciesFound,
        errorCount
      });

      return {
        success: true,
        data: { syncedCount, inconsistenciesFound, errorCount }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `容器状态同步失败: ${errorMessage}`, {
        caId,
        caName
      });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_ERROR, {
        caId,
        caName,
        operation: 'sync',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private updateSyncStats(
    result: SyncResult,
    stats: { syncedCount: number; inconsistenciesFound: number; errorCount: number }
  ): void {
    if (result.synced) {
      stats.syncedCount++;
    }
    if (result.inconsistency) {
      stats.inconsistenciesFound++;
    }
    if (result.error) {
      stats.errorCount++;
    }
  }

  private async syncAllCA(
    caRecords: Array<{ id: number; caName: string; status: string; containerId: string | null }>,
    dockerContainerMap: Map<string, ContainerInfo>,
    prisma: ReturnType<typeof getPrismaClient>,
    now: number,
    stats: { syncedCount: number; inconsistenciesFound: number; errorCount: number }
  ): Promise<void> {
    for (const caRecord of caRecords) {
      const result = await this.syncSingleCA(
        caRecord.id,
        caRecord.caName,
        dockerContainerMap,
        prisma,
        now
      );
      this.updateSyncStats(result, stats);
    }
  }

  private async syncSingleCA(
    caId: number,
    caName: string,
    dockerContainerMap: Map<string, ContainerInfo>,
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    const result: SyncResult = { synced: false, inconsistency: false, error: false };

    try {
      const caRecord = await prisma.codingAgent.findUnique({
        where: { id: caId }
      });

      if (!caRecord) {
        result.error = true;
        return result;
      }

      const dockerContainer = dockerContainerMap.get(caName);

      return await this.handleSyncCase(caRecord, dockerContainer, prisma, now);
    } catch {
      result.error = true;
      return result;
    }
  }

  private async handleSyncCase(
    caRecord: { id: number; caName: string; status: string; containerId: string | null },
    dockerContainer: ContainerInfo | undefined,
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    const result: SyncResult = { synced: false, inconsistency: false, error: false };

    if (!dockerContainer && caRecord.containerId) {
      return this.handleContainerNotFound(caRecord.id, prisma, now);
    }

    if (!dockerContainer && !caRecord.containerId) {
      return this.handleNoContainer(caRecord, prisma, now);
    }

    if (dockerContainer && dockerContainer.state !== 'running') {
      return this.handleContainerNotRunning(caRecord, prisma, now);
    }

    if (dockerContainer?.state === 'running' && caRecord.status === 'error') {
      return this.handleContainerRecovered(caRecord.id, prisma, now);
    }

    if (dockerContainer?.state === 'running' && !caRecord.containerId) {
      return this.handleMissingContainerId(caRecord.id, dockerContainer.id, prisma, now);
    }

    return result;
  }

  private async handleContainerNotFound(
    caId: number,
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    await prisma.codingAgent.update({
      where: { id: caId },
      data: {
        status: 'not_found',
        containerId: null,
        updatedAt: now
      }
    });
    return { synced: true, inconsistency: true, error: false };
  }

  private async handleNoContainer(
    caRecord: { id: number; status: string },
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    if (caRecord.status !== 'not_found' && caRecord.status !== 'error') {
      await prisma.codingAgent.update({
        where: { id: caRecord.id },
        data: {
          status: 'not_found',
          updatedAt: now
        }
      });
      return { synced: true, inconsistency: true, error: false };
    }
    return { synced: false, inconsistency: false, error: false };
  }

  private async handleContainerNotRunning(
    caRecord: { id: number; status: string },
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    if (caRecord.status === 'idle' || caRecord.status === 'busy') {
      await prisma.codingAgent.update({
        where: { id: caRecord.id },
        data: {
          status: 'error',
          updatedAt: now
        }
      });
      return { synced: true, inconsistency: true, error: false };
    }
    return { synced: false, inconsistency: false, error: false };
  }

  private async handleContainerRecovered(
    caId: number,
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    await prisma.codingAgent.update({
      where: { id: caId },
      data: {
        status: 'idle',
        updatedAt: now
      }
    });
    return { synced: true, inconsistency: true, error: false };
  }

  private async handleMissingContainerId(
    caId: number,
    containerId: string,
    prisma: ReturnType<typeof getPrismaClient>,
    now: number
  ): Promise<SyncResult> {
    await prisma.codingAgent.update({
      where: { id: caId },
      data: {
        containerId,
        status: 'idle',
        updatedAt: now
      }
    });
    return { synced: true, inconsistency: true, error: false };
  }
}
