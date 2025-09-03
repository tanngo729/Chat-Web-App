import React, { useState, useRef } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Upload, 
  Button, 
  Avatar, 
  Space, 
  Typography, 
  message,
  Divider 
} from 'antd';
import { 
  UserOutlined, 
  CameraOutlined, 
  EditOutlined, 
  SaveOutlined, 
  CloseOutlined 
} from '@ant-design/icons';
import { useAuthStore } from '../stores';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

const UserProfile = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      const response = await axios.put('/api/users/profile', values, {
        headers: { 
          Authorization: `Bearer ${useAuthStore.getState().token}` 
        }
      });

      updateUser(response.data.user);
      message.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
      message.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post('/api/users/avatar', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${useAuthStore.getState().token}` 
        }
      });

      updateUser(response.data.user);
      message.success('Avatar updated successfully!');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      message.error(error.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }

    return false; // Prevent default upload behavior
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space>
          <UserOutlined />
          <span>Profile Settings</span>
        </Space>
      }
      footer={null}
      width={500}
      styles={{ body: { padding: '24px' } }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {/* Avatar Section */}
        <div 
          style={{ 
            position: 'relative', 
            display: 'inline-block',
            cursor: 'pointer'
          }}
          onClick={handleAvatarClick}
        >
          <Avatar 
            size={120} 
            src={user?.avatarUrl} 
            icon={<UserOutlined />}
            style={{ 
              border: '4px solid #f0f0f0',
              transition: 'all 0.3s ease'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: '#1890ff',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              border: '3px solid white',
              cursor: 'pointer'
            }}
          >
            <CameraOutlined />
          </div>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleAvatarUpload(file);
            }
          }}
        />
        
        <div style={{ marginTop: '16px' }}>
          <Title level={4} style={{ margin: 0 }}>
            {user?.displayName}
          </Title>
          <Text type="secondary">{user?.email}</Text>
        </div>
      </div>

      <Divider />

      {/* Profile Form */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          displayName: user?.displayName,
          bio: user?.bio || '',
          status: user?.status || ''
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Display Name"
          name="displayName"
          rules={[
            { required: true, message: 'Please enter your display name' },
            { min: 2, message: 'Display name must be at least 2 characters' },
            { max: 50, message: 'Display name cannot exceed 50 characters' }
          ]}
        >
          <Input 
            prefix={<UserOutlined />}
            placeholder="Enter your display name"
            showCount
            maxLength={50}
          />
        </Form.Item>

        <Form.Item
          label="Bio"
          name="bio"
          rules={[
            { max: 200, message: 'Bio cannot exceed 200 characters' }
          ]}
        >
          <TextArea 
            placeholder="Tell others about yourself..."
            showCount
            maxLength={200}
            rows={3}
          />
        </Form.Item>

        <Form.Item
          label="Status Message"
          name="status"
          rules={[
            { max: 100, message: 'Status cannot exceed 100 characters' }
          ]}
        >
          <Input 
            placeholder="What's on your mind?"
            showCount
            maxLength={100}
          />
        </Form.Item>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '8px',
          marginTop: '32px'
        }}>
          <Button 
            onClick={onClose}
            icon={<CloseOutlined />}
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            Save Changes
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default UserProfile;