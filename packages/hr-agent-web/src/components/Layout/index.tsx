import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Spin, Space } from 'antd';
import {
  AppstoreOutlined,
  LogoutOutlined,
  UserOutlined,
  RobotOutlined,
  IssuesCloseOutlined,
  PullRequestOutlined,
  CodeOutlined,
  UnorderedListOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ThemeSwitcher } from '../ThemeSwitcher';

const { Header, Content, Sider } = Layout;

const SIDER_COLLAPSED_KEY = 'hra_sider_collapsed';

const MENU_ITEMS = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: '任务编排' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务列表' },
  { key: '/issues', icon: <IssuesCloseOutlined />, label: 'Issues' },
  { key: '/prs', icon: <PullRequestOutlined />, label: 'Pull Requests' },
  { key: '/cas', icon: <CodeOutlined />, label: 'Coding Agents' }
];

const PAGE_TITLES: Record<string, string> = {
  '/tasks': '任务列表',
  '/dashboard': '任务编排工作台'
};

interface LayoutProps {
  children: React.ReactNode;
}

function useSiderCollapse() {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDER_COLLAPSED_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDER_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);
  return { collapsed, toggleCollapsed };
}

export function AppLayout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { collapsed, toggleCollapsed } = useSiderCollapse();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleMenuClick = ({ key }: { key: string }) => navigate(key);

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }
  ];

  const getPageTitle = () => {
    if (PAGE_TITLES[location.pathname]) {
      return PAGE_TITLES[location.pathname];
    }
    if (location.pathname.startsWith('/issues')) {
      return 'Issues 管理';
    }
    if (location.pathname.startsWith('/prs')) {
      return 'Pull Requests 管理';
    }
    if (location.pathname.startsWith('/cas')) {
      return 'Coding Agents 管理';
    }
    return 'HR Agent';
  };

  const selectedKey =
    location.pathname.startsWith('/tasks') && location.pathname !== '/tasks'
      ? '/dashboard'
      : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={240}
        collapsedWidth={80}
        collapsed={collapsed}
        trigger={null}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RobotOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && <h2 style={{ margin: 0, fontSize: '18px' }}>HR Agent</h2>}
        </div>

        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />

        <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Button
            type="text"
            onClick={toggleCollapsed}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            style={{ width: '100%' }}
          />
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>{getPageTitle()}</h1>
          <Space size={16}>
            <ThemeSwitcher />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text">
                <Avatar icon={<UserOutlined />} />
                <span style={{ marginLeft: 8 }}>Admin</span>
              </Button>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px', padding: '24px', background: '#fff', minHeight: 'calc(100vh - 112px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
