import { listContainers, type ContainerInfo } from '../utils/docker/listContainers.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { TASK_CONFIG } from '../config/taskConfig.js';

export class CAStatusSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private currentCheckIndex = 0;
  private isRunning = false;
  private lastSyncTime = 0;

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.scheduleNextSync();
    console.log(`[CAStatusSync] Started with initial interval: ${TASK_CONFIG.CA_STATUS_CHECK_INTERVALS[0]}ms`);
  }

  stop(): void {
    this.isRunning = false;

    if (this.syncInterval !== null) {
      global.clearTimeout(this.syncInterval);
      this.syncInterval = null;
    }

    console.log('[CAStatusSync] Stopped');
  }

  private scheduleNextSync(): void {
    if (!this.isRunning) {
      return;
    }

    const interval = TASK_CONFIG.CA_STATUS_CHECK_INTERVALS[this.currentCheckIndex];

    this.syncInterval = setTimeout(async () => {
      await this.performSync();
      this.incrementCheckIndex();
      this.scheduleNextSync();
    }, interval);
  }

  private incrementCheckIndex(): void {
    if (this.currentCheckIndex < TASK_CONFIG.CA_STATUS_CHECK_INTERVALS.length - 1) {
      this.currentCheckIndex++;
    }
    const nextInterval = TASK_CONFIG.CA_STATUS_CHECK_INTERVALS[this.currentCheckIndex];
    console.log(`[CAStatusSync] Next check in ${nextInterval}ms`);
  }

  private resetCheckIndex(): void {
    this.currentCheckIndex = 0;
    console.log('[CAStatusSync] Reset check index to 0 (10s)');
  }

  private async performSync(): Promise<void> {
    const now = Date.now();
    this.lastSyncTime = now;
    const syncTime = new Date(now).toISOString();

    console.log(`[CAStatusSync] Performing sync at ${syncTime}`);

    try {
      const results = await this.syncAllCA();

      const {
        syncedCount,
        inconsistenciesFound,
        errorCount,
        notFoundCount
      } = this.summarizeResults(results);

      console.log('[CAStatusSync] Sync completed:');
      console.log(`  - Total checked: ${results.length}`);
      console.log(`  - Synced: ${syncedCount}`);
      console.log(`  - Inconsistencies found: ${inconsistenciesFound}`);
      console.log(`  - Errors: ${errorCount}`);
      console.log(`  - Not found: ${notFoundCount}`);

      if (inconsistenciesFound > 0 || errorCount > 0) {
        this.resetCheckIndex();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CAStatusSync] Sync failed: ${errorMessage}`);
      this.resetCheckIndex();
    }
  }

  private async syncAllCA(): Promise<SyncResult[]> {
    const prisma = getPrismaClient();
    const caRecords = await prisma.codingAgent.findMany({
      where: {
        deletedAt: -2,
        status: { not: 'destroyed' }
      }
    });

    if (caRecords.length === 0) {
      console.log('[CAStatusSync] No CA records to sync');
      return [];
    }

    const dockerContainers = await listContainers();
    const dockerContainerMap = new Map(
      dockerContainers.map((dc) => [dc.names[0].replace('/', ''), dc])
    );

    const syncPromises = caRecords.map((caRecord) =>
      this.syncSingleCA(caRecord, dockerContainerMap)
    );

    return Promise.all(syncPromises);
  }

  private async syncSingleCA(
    caRecord: { id: number; caName: string; status: string; containerId: string | null },
    dockerContainerMap: Map<string, ContainerInfo>
  ): Promise<SyncResult> {
    const result: SyncResult = {
      caId: caRecord.id,
      caName: caRecord.caName,
      previousStatus: caRecord.status,
      newStatus: caRecord.status,
      action: 'none',
      error: null
    };

    try {
      const dockerContainer = dockerContainerMap.get(caRecord.caName);
      const now = getCurrentTimestamp();

      if (!dockerContainer && caRecord.containerId) {
        result.action = 'update';
        result.newStatus = 'not_found';
        result.error = 'Container not found in Docker';

        await this.updateCAStatus(caRecord.id, 'not_found', now);

        return result;
      }

      if (!dockerContainer && !caRecord.containerId) {
        if (caRecord.status === 'error' || caRecord.status === 'destroying' || caRecord.status === 'not_found') {
          return result;
        }

        result.action = 'update';
        result.newStatus = 'not_found';
        result.error = 'No container ever created';

        await this.updateCAStatus(caRecord.id, 'not_found', now);

        return result;
      }

      if (dockerContainer && dockerContainer.state !== 'running') {
        if (caRecord.status === 'error') {
          return result;
        }

        result.action = 'update';
        result.newStatus = 'error';
        result.error = 'Container not running';

        await this.updateCAStatus(caRecord.id, 'error', now);

        return result;
      }

      if (dockerContainer?.state === 'running' && caRecord.status === 'error') {
        result.action = 'update';
        result.newStatus = 'idle';
        result.error = 'Container recovered';

        await this.updateCAStatus(caRecord.id, 'idle', now);

        return result;
      }

      if (dockerContainer?.state === 'running' && !caRecord.containerId) {
        result.action = 'update';
        result.newStatus = 'idle';
        result.error = 'Update container ID';

        await this.updateCAContainerId(caRecord.id, dockerContainer.id, now);

        return result;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.error = errorMessage;
      result.action = 'error';
      return result;
    }
  }

  private async updateCAStatus(caId: number, status: string, timestamp: number): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.codingAgent.update({
      where: { id: caId },
      data: {
        status,
        updatedAt: timestamp
      }
    });
  }

  private async updateCAContainerId(caId: number, containerId: string, timestamp: number): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.codingAgent.update({
      where: { id: caId },
      data: {
        containerId,
        status: 'idle',
        updatedAt: timestamp
      }
    });
  }

  private summarizeResults(results: SyncResult[]): {
    syncedCount: number;
    inconsistenciesFound: number;
    errorCount: number;
    notFoundCount: number;
  } {
    return {
      syncedCount: results.filter((r) => r.action === 'update').length,
      inconsistenciesFound: results.filter((r) => r.action !== 'none').length,
      errorCount: results.filter((r) => r.action === 'error').length,
      notFoundCount: results.filter((r) => r.newStatus === 'not_found').length
    };
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  getCurrentCheckInterval(): number {
    return TASK_CONFIG.CA_STATUS_CHECK_INTERVALS[this.currentCheckIndex];
  }

  getCurrentCheckIndex(): number {
    return this.currentCheckIndex;
  }
}

interface SyncResult {
  caId: number;
  caName: string;
  previousStatus: string;
  newStatus: string;
  action: 'none' | 'update' | 'error';
  error: string | null;
}
