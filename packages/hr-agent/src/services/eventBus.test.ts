import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from './eventBus.js';
import { TASK_EVENTS } from '../config/taskEvents.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('register', () => {
    it('应该成功注册事件处理器', () => {
      const handler = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_QUEUED, handler);
      eventBus.emit(TASK_EVENTS.TASK_QUEUED, { id: 1 });
      expect(handler).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('unregister', () => {
    it('应该成功取消注册事件处理器', () => {
      const handler = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_QUEUED, handler);
      eventBus.unregister(TASK_EVENTS.TASK_QUEUED, handler);
      eventBus.emit(TASK_EVENTS.TASK_QUEUED, { id: 1 });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('应该成功触发同步事件', () => {
      const handler = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_COMPLETED, handler);
      const result = eventBus.emit(TASK_EVENTS.TASK_COMPLETED, { id: 1, status: 'completed' });
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({ id: 1, status: 'completed' });
    });
  });

  describe('emitAsync', () => {
    it('应该成功触发异步事件', async () => {
      const handler = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_CANCELLED, handler);
      const result = await eventBus.emitAsync(TASK_EVENTS.TASK_CANCELLED, { id: 1 });
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('once', () => {
    it('应该注册一次性事件处理器', () => {
      const handler = vi.fn();
      eventBus.once(TASK_EVENTS.TASK_STARTED, handler);
      eventBus.emit(TASK_EVENTS.TASK_STARTED, { id: 1 });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('应该清除所有事件处理器', () => {
      const handler = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_FAILED, handler);
      eventBus.clear();
      eventBus.emit(TASK_EVENTS.TASK_FAILED, { id: 1 });
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
