export interface Theme {
  name: 'dark' | 'light';
  colors: {
    bg: {
      primary: string;
      secondary: string;
      glass: string;
      'glass-light': string;
      'glass-hover': string;
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
    };
    purple: {
      main: string;
      light: string;
      dark: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
}
