export const lightTheme = {
  name: 'light' as const,
  colors: {
    bg: {
      primary: '#F8FAFC',
      secondary: '#F1F5F9',
      glass: 'rgba(255, 255, 255, 0.7)',
      'glass-light': 'rgba(255, 255, 255, 0.9)',
      'glass-hover': 'rgba(255, 255, 255, 0.85)'
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      muted: '#94A3B8'
    },
    border: {
      glass: 'rgba(0, 0, 0, 0.08)',
      'glass-hover': 'rgba(0, 0, 0, 0.12)',
      purple: 'rgba(147, 51, 234, 0.3)'
    },
    purple: {
      main: '#9333EA',
      light: '#A855F7',
      dark: '#7C3AED'
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    }
  }
};
