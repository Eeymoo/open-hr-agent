import { describe, it, expect } from 'vitest';
import { parseRouteFileName } from './autoLoadRoutes.js';

describe('parseRouteFileName 单元测试', () => {
  it('应该解析 .post.ts 文件名为 POST 方法', () => {
    const result = parseRouteFileName('issues.post.ts');
    expect(result).toEqual({ routeName: 'issues', method: 'post' });
  });

  it('应该解析 .put.ts 文件名为 PUT 方法', () => {
    const result = parseRouteFileName('user.put.ts');
    expect(result).toEqual({ routeName: 'user', method: 'put' });
  });

  it('应该解析 .delete.ts 文件名为 DELETE 方法', () => {
    const result = parseRouteFileName('data.delete.ts');
    expect(result).toEqual({ routeName: 'data', method: 'delete' });
  });

  it('应该解析 .patch.ts 文件名为 PATCH 方法', () => {
    const result = parseRouteFileName('config.patch.ts');
    expect(result).toEqual({ routeName: 'config', method: 'patch' });
  });

  it('应该解析 .get.ts 文件名为 GET 方法', () => {
    const result = parseRouteFileName('users.get.ts');
    expect(result).toEqual({ routeName: 'users', method: 'get' });
  });

  it('应该解析没有方法后缀的文件名为 GET 方法', () => {
    const result = parseRouteFileName('hello.ts');
    expect(result).toEqual({ routeName: 'hello', method: 'get' });
  });

  it('应该解析 .ts 文件（无后缀）为 GET 方法', () => {
    const result = parseRouteFileName('agents.ts');
    expect(result).toEqual({ routeName: 'agents', method: 'get' });
  });

  it('应该正确处理带路径的文件名', () => {
    const result = parseRouteFileName('webhooks/issues.post.ts');
    expect(result).toEqual({ routeName: 'webhooks/issues', method: 'post' });
  });

  it('应该正确处理多个点的文件名', () => {
    const result = parseRouteFileName('api.v1.data.post.ts');
    expect(result).toEqual({ routeName: 'api.v1.data', method: 'post' });
  });

  it('应该不区分大小写', () => {
    const result1 = parseRouteFileName('item.POST.ts');
    const result2 = parseRouteFileName('item.Post.ts');
    const result3 = parseRouteFileName('item.PUT.ts');

    expect(result1.method).toBe('post');
    expect(result2.method).toBe('post');
    expect(result3.method).toBe('put');
  });
});
