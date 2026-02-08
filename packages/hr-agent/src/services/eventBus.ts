import { EventEmitter } from 'node:events';
import type { TaskEventType } from '../config/taskEvents.js';

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register<T = unknown>(
    eventType: TaskEventType,
    handler: (data: T) => void | Promise<void>
  ): void {
    this.on(eventType, handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unregister<T = unknown>(
    eventType: TaskEventType,
    handler: (data: T) => void | Promise<void>
  ): void {
    this.off(eventType, handler);
  }

  emit<T = unknown>(eventType: TaskEventType, data: T): boolean {
    return super.emit(eventType, data);
  }

  async emitAsync<T = unknown>(eventType: TaskEventType, data: T): Promise<boolean> {
    super.emit(eventType, data);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  once<T = unknown>(eventType: TaskEventType, handler: (data: T) => void | Promise<void>): this {
    return super.on(eventType, handler);
  }

  clear(): void {
    this.removeAllListeners();
  }
}
