import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './routes';
import { ThemeProvider, useTheme } from './components/ThemeProvider';

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

function AppContent() {
  const { theme } = useTheme();
  const isDark = theme.antd.algorithm === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: theme.antd.token.colorPrimary,
          colorBgContainer: theme.antd.token.colorBgContainer,
          colorBorder: theme.antd.token.colorBorder,
          colorBgElevated: theme.antd.token.colorBgElevated,
          borderRadius: 12,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial'
        },
        components: {
          Button: {
            colorPrimary: theme.antd.token.colorPrimary,
            algorithm: true
          },
          Card: {
            colorBgContainer: theme.antd.token.colorBgContainer
          },
          Modal: {
            contentBg: theme.antd.token.colorBgElevated
          },
          Table: {
            headerBg: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)',
            rowHoverBg: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)'
          },
          Input: {
            colorBgContainer: theme.antd.token.colorBgContainer
          },
          Select: {
            colorBgContainer: theme.antd.token.colorBgContainer
          }
        }
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
