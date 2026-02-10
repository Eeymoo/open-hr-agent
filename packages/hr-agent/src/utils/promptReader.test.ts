import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn()
  }
}));

describe('readPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该读取存在的 prompt 文件', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockReturnValue('  继续  ');
    const result = readPrompt('next');
    expect(result).toBe('继续');
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('next.md'), 'utf-8');
  });

  it('应该 trim 文件内容', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockReturnValue('\n  pnpm run check  \n');
    const result = readPrompt('check');
    expect(result).toBe('pnpm run check');
  });

  it('应该处理空行', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockReturnValue('\n\n  \n\n');
    const result = readPrompt('empty');
    expect(result).toBe('');
  });

  it('应该保留中间的空格', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockReturnValue('  hello world  ');
    const result = readPrompt('test');
    expect(result).toBe('hello world');
  });

  it('应该在文件不存在时抛出错误', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });
    expect(() => readPrompt('nonexistent')).toThrow('ENOENT');
  });

  it('应该正确构造文件路径', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockReturnValue('test content');
    readPrompt('example');
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('example.md'), 'utf-8');
  });

  it('应该使用 UTF-8 编码读取文件', async () => {
    const { readPrompt } = await import('./promptReader.js');
    vi.mocked(fs.readFileSync).mockReturnValue('测试内容');
    const result = readPrompt('chinese');
    expect(result).toBe('测试内容');
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf-8');
  });
});
