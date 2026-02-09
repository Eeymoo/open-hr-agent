export {};
declare global {
  var eventBus: import('./services/eventBus.js').EventBus;
  var taskManager: import('./services/taskManager.js').TaskManager;
  var taskRegistry: import('./tasks/taskRegistry.js').TaskRegistry;
  var clearTimeout: (timeoutId: NodeJS.Timeout) => void;
}
