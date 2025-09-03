import React from 'react';
import { Layout, Avatar, Typography, Space, Button, Dropdown } from 'antd';
import { 
  UserOutlined, 
  MoreOutlined,
  InfoCircleOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useAuthStore, usePresenceStore } from '../stores';
import '../styles/ChatArea.scss';

const { Header } = Layout;
const { Text, Title } = Typography;

const ChatHeader = ({ conversation }) => {
  const { user } = useAuthStore();
  const { isUserOnline, getUserPresence } = usePresenceStore();

  if (!conversation) return null;

  const handleMenuClick = ({ key }) => {
    if (key === 'info') {
      console.log('Show conversation info');
    }
  };

  const handleMobileMenu = () => {
    if (window.toggleSidebar) {
      window.toggleSidebar();
    }
  };

  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name;
    } else {
      const otherUser = conversation.members.find(member => member._id !== user._id);
      return otherUser?.displayName || 'Unknown User';
    }
  };

  const getConversationInfo = () => {
    if (conversation.type === 'group') {
      return `${conversation.members.length} members`;
    } else {
      const otherUser = conversation.members.find(member => member._id !== user._id);
      if (otherUser) {
        const presence = getUserPresence(otherUser._id);
        return isUserOnline(otherUser._id) ? 'Online' : 'Offline';
      }
      return 'Offline';
    }
  };

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return <Avatar size={40} icon={<UserOutlined />} />;
    } else {
      const otherUser = conversation.members.find(member => member._id !== user._id);
      return otherUser?.avatarUrl ? 
        <Avatar size={40} src={otherUser.avatarUrl} /> : 
        <Avatar size={40} icon={<UserOutlined />} />;
    }
  };

  const menuItems = [
    {
      key: 'info',
      icon: <InfoCircleOutlined />,
      label: 'Conversation Info',
    },
  ];

  return (
    <Header className="chat-header">
      <div className="header-content">
        <Button 
          className="mobile-menu-btn"
          type="text" 
          icon={<MenuOutlined />} 
          onClick={handleMobileMenu}
          style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
        />
        
        <div className="conversation-avatar">
          {getConversationAvatar()}
        </div>
        
        <div className="conversation-info">
          <div className="conversation-name">
            {getConversationName()}
          </div>
          <div className={`conversation-status ${isUserOnline(conversation.members?.find(m => m._id !== user._id)?._id) ? 'online' : ''}`}>
            {getConversationInfo()}
          </div>
        </div>

        <div className="header-actions">
          <Dropdown 
            menu={{ items: menuItems, onClick: handleMenuClick }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      </div>
    </Header>
  );
};

export default ChatHeader;