import { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Space, message } from 'antd';
import { LockOutlined, RobotOutlined, ApiOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';

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

    const lastError = sessionStorage.getItem('hra_last_error');
    if (lastError) {
      message.error(lastError);
      sessionStorage.removeItem('hra_last_error');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      await login(values.secret);
    } catch (error) {
      console.error('Login failed:', error);
      message.error('登录失败，请检查 SECRET 是否正确');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 450 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, width: '100%' }}>
          <div style={{ alignSelf: 'flex-end' }}>
            <ThemeSwitcher />
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                width: 88,
                height: 88,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '50%',
                border: '2px solid rgba(139, 92, 246, 0.25)'
              }}
            >
              <RobotOutlined />
            </div>
            <Title level={2} style={{ margin: 0, fontSize: 36, fontWeight: 700 }}>
              HR Agent
            </Title>
            <Text style={{ color: '#8b5cf6', fontSize: 13, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>
              AI-Powered Task Orchestration Platform
            </Text>
            <Text style={{ fontSize: 16 }}>智能任务编排平台</Text>
          </div>

          <div style={{ width: '100%', padding: 40, border: '1px solid #f0f0f0', borderRadius: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4} style={{ margin: '0 0 8px' }}>
                  欢迎回来
                </Title>
                <Text type="secondary">请输入 SECRET 进行身份验证</Text>
              </div>

              <Form name="login" onFinish={handleSubmit} autoComplete="off" layout="vertical">
                <Form.Item
                  label="SECRET"
                  name="secret"
                  rules={[{ required: true, message: '请输入 SECRET' }]}
                >
                  <Input prefix={<LockOutlined />} placeholder="请输入 SECRET" size="large" />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    登录
                  </Button>
                </Form.Item>
              </Form>

              <div style={{ textAlign: 'center', paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
                <Space>
                  <ApiOutlined />
                  <Text type="secondary" style={{ fontSize: 13 }}>
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
