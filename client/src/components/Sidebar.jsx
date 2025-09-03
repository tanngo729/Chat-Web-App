import React, { useState, useEffect } from 'react';
import { Layout, Input, List, Avatar, Badge, Button, Space, Typography, Dropdown } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useAuthStore, useConversationStore, useUIStore, usePresenceStore } from '../stores';
import NewChatModal from './NewChatModal';
import UserProfile from './UserProfile';
import '../styles/Sidebar.scss';

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversationId, setActiveConversation } = useConversationStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { isUserOnline, getUserPresence } = usePresenceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Mobile responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expose sidebar control for mobile
  useEffect(() => {
    window.toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    
    if (conv.type === 'group') {
      return conv.name?.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      const otherUser = conv.members.find(member => member._id !== user._id);
      return otherUser?.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  const getConversationName = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.name;
    } else {
      const otherUser = conversation.members.find(member => member._id !== user._id);
      return otherUser?.displayName || 'Unknown User';
    }
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === 'group') {
      return <Avatar size={40} icon={<UserOutlined />} />;
    } else {
      const otherUser = conversation.members.find(member => member._id !== user._id);
      return otherUser?.avatarUrl ? 
        <Avatar size={40} src={otherUser.avatarUrl} /> : 
        <Avatar size={40} icon={<UserOutlined />} />;
    }
  };

  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    
    if (message.type === 'text') {
      return message.body.length > 50 ? `${message.body.substring(0, 50)}...` : message.body;
    } else if (message.type === 'image') {
      return '📷 Image';
    } else if (message.type === 'file') {
      return `📄 ${message.fileName}`;
    }
    
    return 'Message';
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => setProfileModalOpen(true),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sider
        width={isMobile ? 320 : 320}
        collapsed={!isMobile && sidebarCollapsed}
        collapsible={!isMobile}
        className={`chat-sidebar ${isMobile && sidebarOpen ? 'sidebar-open' : ''}`}
        trigger={null}
      >
        <div className="sidebar-header">
          <div className="user-section">
            <div className="user-avatar">
              <Avatar size={40} src={user?.avatarUrl} icon={<UserOutlined />} />
              <div className="online-indicator" />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <>
                <div className="user-info">
                  <div className="user-name">{user?.displayName}</div>
                  <div className="user-status">Online</div>
                </div>
                <div className="user-menu">
                  <Dropdown 
                    menu={{ items: userMenuItems }}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <Button type="text" icon={<SettingOutlined />} />
                  </Dropdown>
                </div>
              </>
            )}
          </div>

          {(!sidebarCollapsed || isMobile) && (
            <>
              <div className="search-section">
                <Input
                  placeholder="Search conversations..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="new-chat-btn">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setNewChatModalOpen(true)}
                >
                  New Chat
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="conversations-section">
          {filteredConversations.length === 0 ? (
            <div className="empty-state">
              <MessageOutlined className="empty-icon" />
              <div className="empty-text">No conversations yet</div>
              <div className="empty-subtext">Start a new chat to begin messaging</div>
            </div>
          ) : (
            <List
              dataSource={filteredConversations}
              renderItem={(conversation) => {
                const otherUser = conversation.type === 'direct' 
                  ? conversation.members.find(member => member._id !== user._id)
                  : null;
                const isOnline = otherUser ? isUserOnline(otherUser._id) : false;
                const isActive = activeConversationId === conversation._id;

                return (
                  <List.Item
                    onClick={() => {
                      setActiveConversation(conversation._id);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={`conversation-item ${isActive ? 'active' : ''} fade-in`}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={conversation.unreadCount || 0} size="small">
                          {getConversationAvatar(conversation)}
                        </Badge>
                      }
                      title={
                        (!sidebarCollapsed || isMobile) && (
                          <div className="conversation-header">
                            <div className="conversation-name">
                              {getConversationName(conversation)}
                            </div>
                            <div className="conversation-time">
                              {formatTime(conversation.lastMessageAt)}
                            </div>
                            {isOnline && <div className="online-status" />}
                          </div>
                        )
                      }
                      description={
                        (!sidebarCollapsed || isMobile) && (
                          <div className="conversation-preview">
                            {formatLastMessage(conversation.lastMessage)}
                          </div>
                        )
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        <NewChatModal
          open={newChatModalOpen}
          onCancel={() => setNewChatModalOpen(false)}
          onSuccess={async (conversation) => {
            setActiveConversation(conversation._id);
            if (isMobile) setSidebarOpen(false);
            // Mark new conversation as read when opened
            try {
              const { markConversationAsRead } = useConversationStore.getState();
              await markConversationAsRead(conversation._id);
            } catch (error) {
              console.error('Failed to mark new conversation as read:', error);
            }
          }}
        />

        <UserProfile
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />
      </Sider>
    </>
  );
};

export default Sidebar;