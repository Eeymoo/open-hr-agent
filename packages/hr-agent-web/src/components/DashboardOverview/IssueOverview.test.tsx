import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { IssueOverview } from './IssueOverview';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../hooks/useIssues', () => ({
  useIssues: vi.fn()
}));

import { useIssues } from '../../hooks/useIssues';

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

describe('IssueOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染 Issue 总览标题', () => {
    vi.mocked(useIssues).mockReturnValue({
      data: { issues: [], pagination: { total: 0, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useIssues>);

    render(
      <TestWrapper>
        <IssueOverview />
      </TestWrapper>
    );

    expect(screen.getByText('Issue 总览')).toBeDefined();
  });

  it('应该显示总 Issue 数', () => {
    vi.mocked(useIssues).mockReturnValue({
      data: { issues: [], pagination: { total: 10, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useIssues>);

    render(
      <TestWrapper>
        <IssueOverview />
      </TestWrapper>
    );

    expect(screen.getByText('总 Issue 数')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
  });

  it('应该显示不同状态的 Issue 统计', () => {
    const mockIssues = [
      { id: 1, issueId: 1, completedAt: -2, deletedAt: -2 },
      { id: 2, issueId: 2, completedAt: 1000, deletedAt: -2 },
      { id: 3, issueId: 3, completedAt: -2, deletedAt: 1000 }
    ];

    vi.mocked(useIssues).mockReturnValue({
      data: { issues: mockIssues, pagination: { total: 3, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useIssues>);

    render(
      <TestWrapper>
        <IssueOverview />
      </TestWrapper>
    );

    expect(screen.getByText('进行中')).toBeDefined();
    expect(screen.getByText('已完成')).toBeDefined();
    expect(screen.getByText('已删除')).toBeDefined();
  });

  it('点击时应该导航到 Issues 页面', () => {
    vi.mocked(useIssues).mockReturnValue({
      data: { issues: [], pagination: { total: 0, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useIssues>);

    render(
      <TestWrapper>
        <IssueOverview />
      </TestWrapper>
    );

    const card = screen.getByText('Issue 总览').closest('.ant-card') as HTMLElement;
    card?.click();
    expect(mockNavigate).toHaveBeenCalledWith('/issues');
  });
});
