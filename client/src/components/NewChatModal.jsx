import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Avatar,
  List,
  Space,
  Typography,
  message,
  Tabs
} from 'antd';
import { UserOutlined, UsergroupAddOutlined, MessageOutlined } from '@ant-design/icons';
import { useAuthStore, useConversationStore } from '../stores';
import { usersAPI } from '../services/api';

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

const NewChatModal = ({ open, onCancel, onSuccess }) => {
  const { user } = useAuthStore();
  const { createConversation } = useConversationStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('direct');

  const handleUserSearch = async (searchValue) => {
    if (!searchValue.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await usersAPI.search(searchValue);
      const users = response.data.data || [];
      // Filter out current user
      setSearchResults(users.filter(u => u._id !== user._id));
    } catch (error) {
      console.error('User search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const conversationData = {
        type: activeTab,
        memberIds: Array.isArray(values.members) ? values.members : [values.members],
        ...(activeTab === 'group' && { name: values.name })
      };

      const result = await createConversation(conversationData);
      if (result.success) {
        message.success(`${activeTab === 'group' ? 'Group' : 'Chat'} created successfully!`);
        form.resetFields();
        setSearchResults([]);
        onSuccess?.(result.conversation);
        onCancel();
      } else {
        message.error(result.error || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      message.error('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const renderUserOption = (user) => (
    <Option key={user._id} value={user._id}>
      <Space>
        <Avatar
          size="small"
          src={user.avatarUrl}
          icon={<UserOutlined />}
        />
        <div>
          <Text strong>{user.displayName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {user.email}
          </Text>
        </div>
      </Space>
    </Option>
  );

  const handleCancel = () => {
    form.resetFields();
    setSearchResults([]);
    setActiveTab('direct');
    onCancel();
  };

  return (
    <Modal
      title="Start New Chat"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'direct',
            label: (
              <Space>
                <MessageOutlined />
                Direct Message
              </Space>
            ),
            children: (
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item
                  name="members"
                  label="Select User"
                  rules={[{ required: true, message: 'Please select a user to chat with' }]}
                >
                  <Select
                    showSearch
                    placeholder="Search for users..."
                    loading={searchLoading}
                    onSearch={handleUserSearch}
                    filterOption={false}
                    notFoundContent={searchLoading ? 'Searching...' : 'No users found'}
                  >
                    {searchResults.map(renderUserOption)}
                  </Select>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Start Chat
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )
          },
          {
            key: 'group',
            label: (
              <Space>
                <UsergroupAddOutlined />
                Create Group
              </Space>
            ),
            children: (
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item
                  name="name"
                  label="Group Name"
                  rules={[
                    { required: true, message: 'Please enter group name' },
                    { min: 2, message: 'Group name must be at least 2 characters' },
                    { max: 100, message: 'Group name cannot exceed 100 characters' }
                  ]}
                >
                  <Input placeholder="Enter group name..." />
                </Form.Item>

                <Form.Item
                  name="members"
                  label="Add Members"
                  rules={[
                    { required: true, message: 'Please add at least one member' },
                    { type: 'array', min: 1, message: 'Please add at least one member' }
                  ]}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    placeholder="Search and select users..."
                    loading={searchLoading}
                    onSearch={handleUserSearch}
                    filterOption={false}
                    notFoundContent={searchLoading ? 'Searching...' : 'No users found'}
                  >
                    {searchResults.map(renderUserOption)}
                  </Select>
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Create Group
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default NewChatModal;