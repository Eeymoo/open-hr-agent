import React from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Spin } from 'antd';
import { HomeOutlined, AppstoreOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
      icon: <HomeOutlined />,
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
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  return (
    <Layout className="app-layout">
      <Sider theme="light" width={200} className="app-sider">
        <div className="app-logo">
          <h2>HR Agent</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header className="app-header">
          <div className="app-header-left">
            <h1>任务管理系统</h1>
          </div>
          <div className="app-header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" icon={<Avatar icon={<UserOutlined />} />}>
                Admin
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
