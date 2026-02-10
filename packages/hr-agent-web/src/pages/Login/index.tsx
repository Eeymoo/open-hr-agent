import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
      login(values.secret);
    } catch (error) {
      message.error('登录失败，请重试');
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <Title level={2}>HR Agent</Title>
          <Text type="secondary">任务管理系统</Text>
        </div>

        <Form name="login" onFinish={handleSubmit} autoComplete="off" layout="vertical">
          <Form.Item
            label="SECRET"
            name="secret"
            rules={[{ required: true, message: '请输入 SECRET' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入 SECRET" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

