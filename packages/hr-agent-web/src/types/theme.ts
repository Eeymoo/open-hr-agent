export interface Theme {
  name: 'dark' | 'light';
  antd: {
    algorithm: 'dark' | 'default';
    token?: {
      colorPrimary?: string;
    };
  };
}
