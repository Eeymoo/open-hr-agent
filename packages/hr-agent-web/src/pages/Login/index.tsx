import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Space } from 'antd';
import { LockOutlined, RobotOutlined, ApiOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import './index.css';

const { Title, Text } = Typography;

interface LoginForm {
  secret: string;
}

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/orchestration', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      await login(values.secret);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="grid-pattern"></div>
      </div>

      <div className="login-content">
        <div className="login-header">
          <div className="theme-toggle">
            <ThemeSwitcher />
          </div>
          <div className="login-logo">
            <div className="logo-icon">
              <RobotOutlined />
            </div>
            <Title level={2} className="login-title">
              HR Agent
            </Title>
            <Text className="login-subtitle">
              AI-Powered Task Orchestration Platform
            </Text>
            <Text className="login-subtitle-zh">
              智能任务编排平台
            </Text>
          </div>

          <div className="login-card">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div className="login-form-header">
                <Title level={4}>欢迎回来</Title>
                <Text type="secondary">请输入 SECRET 进行身份验证</Text>
              </div>

              <Form name="login" onFinish={handleSubmit} autoComplete="off" layout="vertical">
                <Form.Item
                  label="SECRET"
                  name="secret"
                  rules={[{ required: true, message: '请输入 SECRET' }]}
                >
                  <Input
                    prefix={<LockOutlined />}
                    placeholder="请输入 SECRET"
                    size="large"
                    className="login-input"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    size="large"
                    loading={loading}
                    className="login-button"
                  >
                    登录
                  </Button>
                </Form.Item>
              </Form>

              <div className="login-footer">
                <Space>
                  <ApiOutlined />
                  <Text type="secondary" className="footer-text">
                    Powered by AI Technology
                  </Text>
                </Space>
              </div>
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
}
