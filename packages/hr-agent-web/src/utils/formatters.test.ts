import { describe, it, expect } from 'vitest';
import { formatPriority, getPriorityColor } from './formatters';

describe('formatPriority', () => {
  it('应该将 10 转换为"低"', () => {
    expect(formatPriority(10)).toBe('低');
  });

  it('应该将 20 转换为"中"', () => {
    expect(formatPriority(20)).toBe('中');
  });

  it('应该将 30 转换为"高"', () => {
    expect(formatPriority(30)).toBe('高');
  });

  it('应该将非标准优先级数值转为字符串', () => {
    expect(formatPriority(5)).toBe('5');
    expect(formatPriority(15)).toBe('15');
    expect(formatPriority(25)).toBe('25');
    expect(formatPriority(35)).toBe('35');
    expect(formatPriority(100)).toBe('100');
  });

  it('应该处理 0', () => {
    expect(formatPriority(0)).toBe('0');
  });

  it('应该处理负数', () => {
    expect(formatPriority(-1)).toBe('-1');
    expect(formatPriority(-10)).toBe('-10');
  });
});

describe('getPriorityColor', () => {
  it('优先级 < 10 应该返回 "default"（灰色）', () => {
    expect(getPriorityColor(0)).toBe('default');
    expect(getPriorityColor(5)).toBe('default');
    expect(getPriorityColor(9)).toBe('default');
    expect(getPriorityColor(-1)).toBe('default');
  });

  it('优先级在 [10, 30] 区间应该返回 "processing"（蓝色）', () => {
    expect(getPriorityColor(10)).toBe('processing');
    expect(getPriorityColor(15)).toBe('processing');
    expect(getPriorityColor(20)).toBe('processing');
    expect(getPriorityColor(25)).toBe('processing');
    expect(getPriorityColor(30)).toBe('processing');
  });

  it('优先级 > 30 应该返回 "error"（红色）', () => {
    expect(getPriorityColor(31)).toBe('error');
    expect(getPriorityColor(35)).toBe('error');
    expect(getPriorityColor(50)).toBe('error');
    expect(getPriorityColor(100)).toBe('error');
  });
});
