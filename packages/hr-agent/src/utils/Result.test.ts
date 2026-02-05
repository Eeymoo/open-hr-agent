import { describe, it, expect } from 'vitest';
import Result from './Result.js';

describe('Result 类', () => {
  it('应该创建成功的 Result 实例', () => {
    const result = new Result({ id: 1 }, 200, 'success');
    expect(result.code).toBe(200);
    expect(result.message).toBe('success');
    expect(result.data).toEqual({ id: 1 });
  });

  it('应该使用默认值创建 Result 实例', () => {
    const result = new Result();
    expect(result.code).toBe(200);
    expect(result.message).toBe('success');
  });

  it('应该设置错误状态', () => {
    const result = new Result();
    result.error(400, 'Bad Request');
    expect(result.code).toBe(400);
    expect(result.message).toBe('Bad Request');
  });

  it('应该设置错误状态并返回 this', () => {
    const result = new Result();
    const returned = result.error(500, 'Server Error');
    expect(returned).toBe(result);
  });

  it('应该设置成功状态', () => {
    const result = new Result();
    result.success({ userId: 123 }, 'User created');
    expect(result.code).toBe(200);
    expect(result.message).toBe('User created');
    expect(result.data).toEqual({ userId: 123 });
  });

  it('应该设置成功状态并返回 this', () => {
    const result = new Result();
    const returned = result.success({});
    expect(returned).toBe(result);
  });

  it('应该正确转换为 JSON', () => {
    const result = new Result({ name: 'test' }, 200, 'OK');
    const json = result.toJSON();
    expect(json).toEqual({
      code: 200,
      message: 'OK',
      data: { name: 'test' }
    });
  });
});
