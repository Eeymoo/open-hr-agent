export const darkTheme = {
  name: 'dark' as const,
  colors: {
    bg: {
      primary: '#0a0a0a',
      secondary: '#0f0f0f',
      glass: 'rgba(30, 30, 30, 0.6)',
      'glass-light': 'rgba(40, 40, 40, 0.8)',
      'glass-hover': 'rgba(50, 50, 50, 0.7)'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A1A1AA',
      muted: '#71717A'
    },
    border: {
      glass: 'rgba(255, 255, 255, 0.08)',
      'glass-hover': 'rgba(255, 255, 255, 0.12)',
      purple: 'rgba(147, 51, 234, 0.5)'
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
