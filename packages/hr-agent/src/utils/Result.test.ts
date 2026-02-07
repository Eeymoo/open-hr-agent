import { describe, it, expect } from 'vitest';
import Result from './Result.js';

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
} as const;

describe('Result 类', () => {
  it('应该创建成功的 Result 实例', () => {
    const result = new Result({ id: 1 }, HTTP_STATUS.OK, 'success');
    expect(result.code).toBe(HTTP_STATUS.OK);
    expect(result.message).toBe('success');
    expect(result.data).toEqual({ id: 1 });
  });

  it('应该使用默认值创建 Result 实例', () => {
    const result = new Result();
    expect(result.code).toBe(HTTP_STATUS.OK);
    expect(result.message).toBe('success');
  });

  it('应该设置错误状态', () => {
    const result = new Result();
    result.error(HTTP_STATUS.BAD_REQUEST, 'Bad Request');
    expect(result.code).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(result.message).toBe('Bad Request');
  });

  it('应该设置错误状态并返回 this', () => {
    const result = new Result();
    const returned = result.error(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Server Error');
    expect(returned).toBe(result);
  });

  it('应该设置成功状态', () => {
    const result = new Result();
    result.success({ userId: 123 }, 'User created');
    expect(result.code).toBe(HTTP_STATUS.OK);
    expect(result.message).toBe('User created');
    expect(result.data).toEqual({ userId: 123 });
  });

  it('应该设置成功状态并返回 this', () => {
    const result = new Result();
    const returned = result.success({});
    expect(returned).toBe(result);
  });

  it('应该正确转换为 JSON', () => {
    const result = new Result({ name: 'test' }, HTTP_STATUS.OK, 'OK');
    const json = result.toJSON();
    expect(json).toEqual({
      code: HTTP_STATUS.OK,
      message: 'OK',
      data: { name: 'test' }
    });
  });
});
