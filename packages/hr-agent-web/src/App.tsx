import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeProvider';

import 'antd/dist/reset.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000
    }
  }
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={zhCN}
          theme={{
            algorithm: antdTheme.darkAlgorithm,
            token: {
              colorPrimary: '#9333EA',
              colorBgContainer: 'rgba(30, 30, 30, 0.6)',
              colorBorder: 'rgba(255, 255, 255, 0.08)',
              colorBgElevated: 'rgba(40, 40, 40, 0.8)',
              borderRadius: 16,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial'
            },
            components: {
              Button: {
                colorPrimary: '#9333EA',
                algorithm: true
              },
              Card: {
                colorBgContainer: 'rgba(30, 30, 30, 0.6)'
              },
              Modal: {
                contentBg: 'rgba(30, 30, 30, 0.8)'
              }
            }
          }}
        >
          <RouterProvider router={router} />
        </ConfigProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
