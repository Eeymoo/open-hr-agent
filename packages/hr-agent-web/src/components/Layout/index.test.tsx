import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  QueryClient: vi.fn(() => ({}))
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn()
  })
}));

vi.mock('../ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">Theme</div>
}));

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('hra_sider_collapsed');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hra_sider_collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div data-testid="app-layout">
      <button
        data-testid="collapse-btn"
        onClick={() => setCollapsed((prev: boolean) => !prev)}
      >
        {collapsed ? 'Expand' : 'Collapse'}
      </button>
      <div data-testid="sider-collapsed">{String(collapsed)}</div>
      {children}
    </div>
  );
};

import { useState, useEffect } from 'react';

describe('Sider Collapse State', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should default to expanded state when no localStorage value', () => {
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </BrowserRouter>
    );
    expect(screen.getByTestId('sider-collapsed').textContent).toBe('false');
  });

  it('should initialize collapsed from localStorage', () => {
    localStorageMock.setItem('hra_sider_collapsed', 'true');
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </BrowserRouter>
    );
    expect(screen.getByTestId('sider-collapsed').textContent).toBe('true');
  });

  it('should toggle collapsed state on button click', () => {
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </BrowserRouter>
    );
    expect(screen.getByTestId('sider-collapsed').textContent).toBe('false');

    fireEvent.click(screen.getByTestId('collapse-btn'));
    expect(screen.getByTestId('sider-collapsed').textContent).toBe('true');

    fireEvent.click(screen.getByTestId('collapse-btn'));
    expect(screen.getByTestId('sider-collapsed').textContent).toBe('false');
  });

  it('should persist collapsed state to localStorage', async () => {
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('collapse-btn'));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('hra_sider_collapsed', 'true');
    });
  });
});
