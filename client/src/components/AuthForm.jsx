import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores';

const { Title, Text } = Typography;

const AuthForm = ({ type }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, register, loading, error, clearError } = useAuthStore();
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = type === 'login';

  const handleSubmit = async (values) => {
    if (submitting) return;
    
    setSubmitting(true);
    clearError();
    setLocalError('');
    
    try {
      console.log('Form submitting:', isLogin ? 'login' : 'register', values);
      const result = isLogin 
        ? await login({ email: values.email, password: values.password })
        : await register({
            email: values.email,
            password: values.password,
            displayName: values.displayName
          });

      console.log('Auth result:', result);
      
      if (result.success) {
        console.log('✅ Auth success, navigating...');
        navigate('/app');
      } else {
        console.log('❌ Auth failed:', result.error);
        setLocalError(result.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('❌ Form submission error:', err);
      setLocalError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = () => {
    if (error || localError) {
      clearError();
      setLocalError('');
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        styles={{ body: { padding: '32px' } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8, color: '#CBB42D' }}>
              ChatApp
            </Title>
            <Text type="secondary">
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </Text>
          </div>

          {(error || localError) && (
            <Alert
              message={error || localError}
              type="error"
              closable
              onClose={() => {
                clearError();
                setLocalError('');
              }}
            />
          )}

          <Form
            form={form}
            name={isLogin ? 'login' : 'register'}
            onFinish={handleSubmit}
            onChange={handleFormChange}
            size="large"
            layout="vertical"
          >
            {!isLogin && (
              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[
                  { required: true, message: 'Please input your display name!' },
                  { min: 1, max: 50, message: 'Display name must be 1-50 characters' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Your display name"
                  autoComplete="name"
                />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="your.email@example.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please input your password!' },
                { min: 6, message: 'Password must be at least 6 characters!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Your password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading || submitting}
                disabled={submitting}
                block
                style={{ height: 'auto', padding: '12px' }}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text type="secondary">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Link to={isLogin ? '/register' : '/login'}>
              <Button type="link" size="large">
                {isLogin ? 'Create Account' : 'Sign In'}
              </Button>
            </Link>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default AuthForm;