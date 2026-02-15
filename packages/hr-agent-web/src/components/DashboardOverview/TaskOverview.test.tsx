import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TaskOverview } from './TaskOverview';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../hooks/useTasks', () => ({
  useTasks: vi.fn()
}));

import { useTasks } from '../../hooks/useTasks';

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

describe('TaskOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染任务总览标题', () => {
    vi.mocked(useTasks).mockReturnValue({
      data: { tasks: [], pagination: { total: 0, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useTasks>);

    render(
      <TestWrapper>
        <TaskOverview />
      </TestWrapper>
    );

    expect(screen.getByText('任务总览')).toBeDefined();
  });

  it('应该显示统计数据', () => {
    const mockTasks = [
      { id: 1, status: 'queued' },
      { id: 2, status: 'running' },
      { id: 3, status: 'completed' },
      { id: 4, status: 'error' }
    ];

    vi.mocked(useTasks).mockReturnValue({
      data: { tasks: mockTasks, pagination: { total: 4, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useTasks>);

    render(
      <TestWrapper>
        <TaskOverview />
      </TestWrapper>
    );

    expect(screen.getByText('总任务数')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
  });

  it('点击时应该导航到任务页面', () => {
    vi.mocked(useTasks).mockReturnValue({
      data: { tasks: [], pagination: { total: 0, page: 1, pageSize: 10 } },
      isLoading: false
    } as unknown as ReturnType<typeof useTasks>);

    render(
      <TestWrapper>
        <TaskOverview />
      </TestWrapper>
    );

    const card = screen.getByText('任务总览').closest('.ant-card') as HTMLElement;
    card?.click();
    expect(mockNavigate).toHaveBeenCalledWith('/tasks');
  });
});
