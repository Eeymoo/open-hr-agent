import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context';

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

const TestComponent = () => {
  const { themeName, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-name">{themeName}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  );
};

const renderWithProviders = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should default to dark theme', () => {
    renderWithProviders();
    expect(screen.getByTestId('theme-name').textContent).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    renderWithProviders();
    expect(screen.getByTestId('theme-name').textContent).toBe('dark');

    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('theme-name').textContent).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    localStorageMock.setItem('hr-agent-theme', 'light');
    renderWithProviders();
    expect(screen.getByTestId('theme-name').textContent).toBe('light');

    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('theme-name').textContent).toBe('dark');
  });

  it('should save theme to localStorage', () => {
    renderWithProviders();
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('hr-agent-theme', 'light');
  });

  it('should set data-theme attribute on document', () => {
    renderWithProviders();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
