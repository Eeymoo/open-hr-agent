export interface Theme {
  name: 'dark' | 'light';
  colors: {
    bg: {
      primary: string;
      secondary: string;
      tertiary: string;
      glass: string;
      'glass-light': string;
      'glass-hover': string;
      'glass-solid': string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: {
      glass: string;
      'glass-hover': string;
      purple: string;
      glow: string;
      'glow-strong': string;
    };
    purple: {
      main: string;
      light: string;
      dark: string;
      glow: string;
    };
    accent: {
      cyan: string;
      pink: string;
      blue: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    shadow: {
      glass: string;
      glow: string;
      card: string;
    };
  };
  antd: {
    algorithm: 'dark' | 'default';
    token: {
      colorPrimary: string;
      colorBgContainer: string;
      colorBorder: string;
      colorBgElevated: string;
    };
  };
}
