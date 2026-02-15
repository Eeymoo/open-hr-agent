import type { Theme } from '../types/theme';

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    bg: {
      primary: '#f8fafc',
      secondary: '#f1f5f9',
      tertiary: '#e2e8f0',
      glass: 'rgba(255, 255, 255, 0.8)',
      'glass-light': 'rgba(255, 255, 255, 0.95)',
      'glass-hover': 'rgba(241, 245, 249, 0.9)',
      'glass-solid': 'rgba(255, 255, 255, 0.98)'
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#64748b'
    },
    border: {
      glass: 'rgba(0, 0, 0, 0.08)',
      'glass-hover': 'rgba(0, 0, 0, 0.12)',
      purple: 'rgba(147, 51, 234, 0.4)',
      glow: 'rgba(147, 51, 234, 0.2)',
      'glow-strong': 'rgba(147, 51, 234, 0.35)'
    },
    purple: {
      main: '#9333EA',
      light: '#A855F7',
      dark: '#7C3AED',
      glow: 'rgba(147, 51, 234, 0.25)'
    },
    accent: {
      cyan: '#0891b2',
      pink: '#db2777',
      blue: '#2563eb'
    },
    status: {
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#2563eb'
    },
    shadow: {
      glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
      glow: '0 0 40px rgba(147, 51, 234, 0.1)',
      card: '0 4px 24px rgba(0, 0, 0, 0.06)'
    }
  },
  antd: {
    algorithm: 'default',
    token: {
      colorPrimary: '#9333EA',
      colorBgContainer: 'rgba(255, 255, 255, 0.9)',
      colorBorder: 'rgba(0, 0, 0, 0.08)',
      colorBgElevated: 'rgba(255, 255, 255, 0.98)'
    }
  }
};
