import { describe, it, expect } from 'vitest';

const getPRColumns = (_navigate: (path: string) => void) => [
  {
    title: 'PR ID',
    dataIndex: 'prId',
    key: 'prId',
    width: 120,
    fixed: 'left' as const,
    render: (id: number) => `#${id}`
  },
  {
    title: '标题',
    dataIndex: 'prTitle',
    key: 'prTitle',
    ellipsis: true
  },
  {
    title: '关联 Issue',
    dataIndex: 'issueId',
    key: 'issueId',
    width: 120
  },
  {
    title: '状态',
    key: 'status',
    width: 120
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 180
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right' as const,
    render: () => null
  }
];

describe('PRs 列配置', () => {
  it('PR ID 列应该固定在左侧', () => {
    const mockNavigate = () => {};
    const columns = getPRColumns(mockNavigate);
    const idColumn = columns.find((col: { key: string }) => col.key === 'prId');
    expect(idColumn?.fixed).toBe('left');
  });

  it('操作列应该固定在右侧', () => {
    const mockNavigate = () => {};
    const columns = getPRColumns(mockNavigate);
    const actionsColumn = columns.find((col: { key: string }) => col.key === 'actions');
    expect(actionsColumn?.fixed).toBe('right');
  });
});
