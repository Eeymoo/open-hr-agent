import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { PrOverview } from './PrOverview';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../hooks/usePrs', () => ({
  usePRs: vi.fn()
}));

import { usePRs } from '../../hooks/usePrs';

const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={mockQueryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe('PrOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染 PR 总览标题', () => {
    vi.mocked(usePRs).mockReturnValue({
      data: { prs: [], pagination: { total: 0, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof usePRs>);

    render(
      <TestWrapper>
        <PrOverview />
      </TestWrapper>
    );

    expect(screen.getByText('PR 总览')).toBeDefined();
  });

  it('应该显示总 PR 数', () => {
    vi.mocked(usePRs).mockReturnValue({
      data: { prs: [], pagination: { total: 15, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof usePRs>);

    render(
      <TestWrapper>
        <PrOverview />
      </TestWrapper>
    );

    expect(screen.getByText('总 PR 数')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
  });

  it('应该显示不同状态的 PR 统计', () => {
    const mockPRs = [
      { id: 1, prId: 1, completedAt: -2, deletedAt: -2 },
      { id: 2, prId: 2, completedAt: 2000, deletedAt: -2 },
      { id: 3, prId: 3, completedAt: -2, deletedAt: 2000 }
    ];

    vi.mocked(usePRs).mockReturnValue({
      data: { prs: mockPRs, pagination: { total: 3, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof usePRs>);

    render(
      <TestWrapper>
        <PrOverview />
      </TestWrapper>
    );

    expect(screen.getByText('进行中')).toBeDefined();
    expect(screen.getByText('已合并')).toBeDefined();
    expect(screen.getByText('已删除')).toBeDefined();
  });

  it('点击时应该导航到 PRs 页面', () => {
    vi.mocked(usePRs).mockReturnValue({
      data: { prs: [], pagination: { total: 0, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof usePRs>);

    render(
      <TestWrapper>
        <PrOverview />
      </TestWrapper>
    );

    const card = screen.getByText('PR 总览').closest('.ant-card') as HTMLElement;
    card?.click();
    expect(mockNavigate).toHaveBeenCalledWith('/prs');
  });
});
