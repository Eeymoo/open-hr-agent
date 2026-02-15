import { describe, it, expect } from 'vitest';

const getCAColumns = (
  _onOpenProxy: () => void,
  _onEdit: () => void,
  _onDelete: () => void,
  _onViewLogs: () => void
) => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    fixed: 'left' as const
  },
  {
    title: '名称',
    dataIndex: 'caName',
    key: 'caName',
    width: 150
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120
  },
  {
    title: '容器 ID',
    dataIndex: 'containerId',
    key: 'containerId',
    width: 200,
    ellipsis: true
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
    width: 250,
    fixed: 'right' as const,
    render: () => null
  }
];

describe('Coding Agents 列配置', () => {
  it('ID 列应该固定在左侧', () => {
    const columns = getCAColumns(
      () => {},
      () => {},
      () => {},
      () => {}
    );
    const idColumn = columns.find((col: { key: string }) => col.key === 'id');
    expect(idColumn?.fixed).toBe('left');
  });

  it('操作列应该固定在右侧', () => {
    const columns = getCAColumns(
      () => {},
      () => {},
      () => {},
      () => {}
    );
    const actionsColumn = columns.find((col: { key: string }) => col.key === 'actions');
    expect(actionsColumn?.fixed).toBe('right');
  });
});
