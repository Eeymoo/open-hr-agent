import { EventEmitter } from 'node:events';
import type { TaskEventType } from '../config/taskEvents.js';

export class EventBus extends EventEmitter {
  constructor() {
    super();
    // eslint-disable-next-line no-magic-numbers
    this.setMaxListeners(100);
  }

  register<T = unknown>(
    eventType: TaskEventType,
    handler: (_data: T) => void | Promise<void>
  ): void {
    this.on(eventType, handler);
  }

  unregister<T = unknown>(
    eventType: TaskEventType,
    handler: (_data: T) => void | Promise<void>
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

  once<T = unknown>(eventType: TaskEventType, handler: (_data: T) => void | Promise<void>): this {
    return super.on(eventType, handler);
  }

  clear(): void {
    this.removeAllListeners();
  }
}
