import React from 'react';
import { Avatar, Tooltip, Space } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { usePresenceStore } from '../stores';

const ReadReceipts = ({ message, conversationMembers, currentUserId, size = 'small' }) => {
  const { formatLastSeen } = usePresenceStore();

  if (!message.readBy || message.readBy.length === 0) {
    return null;
  }

  // Don't show read receipts for own messages in direct conversations
  if (message.senderId._id === currentUserId && conversationMembers.length === 2) {
    const otherMember = conversationMembers.find(m => m._id !== currentUserId);
    const isReadByOtherMember = message.readBy.some(receipt => receipt.userId === otherMember._id);
    
    return isReadByOtherMember ? (
      <Tooltip title={`Read by ${otherMember.displayName}`}>
        <CheckOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
      </Tooltip>
    ) : (
      <CheckOutlined style={{ fontSize: '12px', color: '#d9d9d9' }} />
    );
  }

  // For group conversations, show avatars of users who read the message
  const readByUsers = message.readBy
    .map(receipt => {
      const user = conversationMembers.find(member => member._id === receipt.userId);
      return user ? { ...user, readAt: receipt.at } : null;
    })
    .filter(Boolean)
    .filter(user => user._id !== currentUserId); // Don't show current user

  if (readByUsers.length === 0) {
    return null;
  }

  // If message is read by everyone except sender, show a simple check
  if (readByUsers.length === conversationMembers.length - 1) {
    return (
      <Tooltip title="Read by all">
        <CheckOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
      </Tooltip>
    );
  }

  // Show individual avatars for partial reads
  return (
    <Space size={2}>
      {readByUsers.slice(0, 3).map((user) => (
        <Tooltip
          key={user._id}
          title={`Read by ${user.displayName} at ${new Date(user.readAt).toLocaleString()}`}
        >
          <Avatar
            size={size === 'small' ? 14 : 16}
            src={user.avatarUrl}
            style={{ 
              fontSize: '8px',
              border: '1px solid #fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {user.displayName?.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
      {readByUsers.length > 3 && (
        <Tooltip
          title={`And ${readByUsers.length - 3} more`}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#666',
              fontWeight: 500
            }}
          >
            +{readByUsers.length - 3}
          </div>
        </Tooltip>
      )}
    </Space>
  );
};

export default ReadReceipts;