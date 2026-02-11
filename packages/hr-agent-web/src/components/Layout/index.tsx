import React from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Spin, Space } from 'antd';
import {
  AppstoreOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  RobotOutlined,
  BellOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ThemeSwitcher } from '../ThemeSwitcher';
import './index.css';
import '../AuthGuard/index.css';

const { Header, Content, Sider } = Layout;

interface LayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, logout } = useAuth();

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

  const menuItems = [
    {
      key: '/orchestration',
      icon: <AppstoreOutlined />,
      label: '任务编排'
    },
    {
      key: '/tasks',
      icon: <FileTextOutlined />,
      label: '任务查看'
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
  };

  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置'
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  return (
    <Layout className="app-layout">
      <Sider theme="dark" width={240} className="app-sider">
        <div className="app-logo">
          <div className="logo-icon">
            <RobotOutlined />
          </div>
          <div className="logo-text">
            <h2>HR Agent</h2>
            <span className="logo-badge">AI Powered</span>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="app-menu"
        />

        <div className="sider-footer">
          <div className="system-status">
            <span className="status-dot online"></span>
            <span>系统在线</span>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header className="app-header">
          <div className="app-header-left">
            <h1 className="header-title">任务编排工作台</h1>
          </div>
          <div className="app-header-right">
            <Space size={16}>
              <ThemeSwitcher />
              <Button
                type="text"
                icon={<BellOutlined />}
                className="header-icon-btn"
              >
                <Badge count={3} size="small" />
              </Button>
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
