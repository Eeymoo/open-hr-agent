import { describe, it, expect } from 'vitest';

const getTaskListColumns = (_onNavigate: (path: string) => void) => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    fixed: 'left' as const
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 140
  },
  {
    title: '进度',
    key: 'progress',
    width: 150
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 150
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 90
  },
  {
    title: 'Issue',
    key: 'issue',
    width: 180
  },
  {
    title: 'PR',
    key: 'pr',
    width: 120
  },
  {
    title: 'CA',
    key: 'ca',
    width: 120
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160
  }
];

describe('TaskList 列配置', () => {
  it('ID 列应该固定在左侧', () => {
    const columns = getTaskListColumns(() => {});
    const idColumn = columns.find((col: { key: string }) => col.key === 'id');
    expect(idColumn?.fixed).toBe('left');
  });
});
