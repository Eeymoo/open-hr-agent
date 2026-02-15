import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { OverviewCard } from './OverviewCard';

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

describe('OverviewCard', () => {
  it('应该渲染标题和图标', () => {
    render(
      <TestWrapper>
        <OverviewCard title="测试标题" icon={<span data-testid="test-icon">icon</span>}>
          <div>内容</div>
        </OverviewCard>
      </TestWrapper>
    );

    expect(screen.getByText('测试标题')).toBeDefined();
    expect(screen.getByTestId('test-icon')).toBeDefined();
  });

  it('应该渲染子内容', () => {
    render(
      <TestWrapper>
        <OverviewCard title="标题" icon={<span>icon</span>}>
          <div data-testid="child-content">子内容</div>
        </OverviewCard>
      </TestWrapper>
    );

    expect(screen.getByTestId('child-content')).toBeDefined();
  });

  it('loading状态时应该显示骨架屏', () => {
    render(
      <TestWrapper>
        <OverviewCard title="标题" icon={<span>icon</span>} loading>
          <div>内容</div>
        </OverviewCard>
      </TestWrapper>
    );

    expect(screen.getByText('标题')).toBeDefined();
    expect(document.querySelector('.ant-skeleton')).toBeDefined();
  });

  it('点击时应该调用onClick', () => {
    const onClick = vi.fn();
    render(
      <TestWrapper>
        <OverviewCard title="标题" icon={<span>icon</span>} onClick={onClick}>
          <div>内容</div>
        </OverviewCard>
      </TestWrapper>
    );

    const card = screen.getByText('标题').closest('.ant-card') as HTMLElement;
    card?.click();
    expect(onClick).toHaveBeenCalled();
  });
});
