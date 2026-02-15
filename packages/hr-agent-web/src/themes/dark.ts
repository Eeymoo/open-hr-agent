import type { Theme } from '../types/theme';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    bg: {
      primary: '#030712',
      secondary: '#0a0f1a',
      tertiary: '#111827',
      glass: 'rgba(15, 23, 42, 0.75)',
      'glass-light': 'rgba(30, 41, 59, 0.85)',
      'glass-hover': 'rgba(51, 65, 85, 0.6)',
      'glass-solid': 'rgba(15, 23, 42, 0.95)'
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      muted: '#64748b'
    },
    border: {
      glass: 'rgba(148, 163, 184, 0.1)',
      'glass-hover': 'rgba(148, 163, 184, 0.2)',
      purple: 'rgba(139, 92, 246, 0.5)',
      glow: 'rgba(139, 92, 246, 0.3)',
      'glow-strong': 'rgba(139, 92, 246, 0.5)'
    },
    purple: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
      glow: 'rgba(139, 92, 246, 0.4)'
    },
    accent: {
      cyan: '#22d3ee',
      pink: '#ec4899',
      blue: '#3b82f6'
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    shadow: {
      glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      glow: '0 0 40px rgba(139, 92, 246, 0.15)',
      card: '0 4px 24px rgba(0, 0, 0, 0.3)'
    }
  },
  antd: {
    algorithm: 'dark',
    token: {
      colorPrimary: '#9333EA',
      colorBgContainer: 'rgba(30, 30, 30, 0.6)',
      colorBorder: 'rgba(255, 255, 255, 0.08)',
      colorBgElevated: 'rgba(40, 40, 40, 0.8)'
    }
  }
};
