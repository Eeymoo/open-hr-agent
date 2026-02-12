import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import toonMiddleware from './middleware/responseFormat/toonMiddleware.js';
import autoLoadRoutes from './middleware/autoLoadRoutes.js';
import caProxyMiddleware from './middleware/caProxy.js';
import validateSecretMiddleware from './middleware/validateSecret.js';
import { EventBus } from './services/eventBus.js';
import { TaskLogger } from './utils/taskLogger.js';
import { TaskRegistry } from './tasks/taskRegistry.js';
import { TaskScheduler } from './services/taskScheduler.js';
import { TaskManager } from './services/taskManager.js';
import { TASK_CONFIG } from './config/taskConfig.js';
import { CONTAINER_TASK_PRIORITIES } from './config/taskPriorities.js';
import type { BaseTask } from './tasks/baseTask.js';

dotenv.config();

const app = express();
const DEFAULT_PORT = 3000;
const PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTES_DIR = join(__dirname, 'routes');

app.use(express.json());
app.use(toonMiddleware);

const v1Router = express.Router();
v1Router.use(validateSecretMiddleware);

await autoLoadRoutes(v1Router, join(ROUTES_DIR, 'v1'));

app.use('/v1', v1Router);

const nonV1Router = express.Router();
await autoLoadRoutes(nonV1Router, ROUTES_DIR);

app.use('/', nonV1Router);

app.use(caProxyMiddleware);

const eventBus = new EventBus();
const logger = new TaskLogger();
const taskRegistry = new TaskRegistry(eventBus, logger);
const taskMap = new Map<string, BaseTask>(taskRegistry.getAll().map((task) => [task.name, task]));
const taskScheduler = new TaskScheduler(eventBus, taskMap);
const taskManager = new TaskManager(eventBus, taskScheduler);

global.eventBus = eventBus;
global.taskManager = taskManager;
global.taskRegistry = taskRegistry;

taskManager.start();

let currentSyncIndex = 0;
let syncTimeout: NodeJS.Timeout | null = null;
let lastSyncHadInconsistency = false;

function scheduleContainerSync(): void {
  const intervals = TASK_CONFIG.CA_STATUS_CHECK_INTERVALS;
  let interval: number;

  if (lastSyncHadInconsistency) {
    interval = intervals[0];
    currentSyncIndex = 0;
  } else {
    interval = intervals[currentSyncIndex];
    if (currentSyncIndex < intervals.length - 1) {
      currentSyncIndex++;
    }
  }

  syncTimeout = setTimeout(async () => {
    try {
      const result = await taskManager.run('container_sync', {}, CONTAINER_TASK_PRIORITIES.SYNC);

      lastSyncHadInconsistency = result !== null;
    } catch (error) {
      console.error('Container sync error:', error);
      lastSyncHadInconsistency = true;
    }

    scheduleContainerSync();
  }, interval);
}

function stopContainerSync(): void {
  if (syncTimeout) {
    global.clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Task Manager has been initialized');
  scheduleContainerSync();
  console.log('Container Sync Scheduler has been initialized');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  taskManager.stop();
  stopContainerSync();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  taskManager.stop();
  stopContainerSync();
  process.exit(0);
});
