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
import './index.css';
import '../AuthGuard/index.css';

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
      <div className="auth-guard-loading">
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
    <Layout className="app-layout">
      <Sider
        theme="dark"
        width={240}
        collapsedWidth={80}
        collapsed={collapsed}
        className="app-sider"
        trigger={null}
      >
        <div className="app-logo">
          <div className="logo-icon">
            <RobotOutlined />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <h2>HR Agent</h2>
              <span className="logo-badge">AI Powered</span>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          onClick={handleMenuClick}
          className="app-menu"
        />

        <div className="sider-footer">
          <Button
            type="text"
            className="collapse-btn"
            onClick={toggleCollapsed}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          />
          {!collapsed && (
            <div className="system-status">
              <span className="status-dot online"></span>
              <span>系统在线</span>
            </div>
          )}
        </div>
      </Sider>

      <Layout>
        <Header className="app-header">
          <div className="app-header-left">
            <h1 className="header-title">{getPageTitle()}</h1>
          </div>
          <div className="app-header-right">
            <Space size={16}>
              <ThemeSwitcher />
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" className="user-btn">
                  <Avatar icon={<UserOutlined />} className="user-avatar" />
                  <span className="user-name">Admin</span>
                </Button>
              </Dropdown>
            </Space>
          </div>
        </Header>

        <Content className="app-content">
          <div className="content-background">
            <div className="grid-pattern"></div>
          </div>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
