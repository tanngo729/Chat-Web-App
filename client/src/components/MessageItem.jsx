import React, { useState } from 'react';
import { Avatar, Typography, Space, Dropdown, Button, Image } from 'antd';
import { 
  UserOutlined, 
  MoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined 
} from '@ant-design/icons';
import { useMessageStore } from '../stores';
import ReadReceipts from './ReadReceipts';

const { Text } = Typography;

const MessageItem = ({ message, isOwnMessage, showAvatar, conversationId, conversationMembers, currentUserId }) => {
  const [showActions, setShowActions] = useState(false);
  const { deleteMessage } = useMessageStore();

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.body);
  };

  const handleDeleteMessage = async () => {
    await deleteMessage(message._id);
  };

  const menuItems = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy Text',
      onClick: handleCopyText,
      disabled: message.type !== 'text'
    },
    ...((message.type === 'file' || message.type === 'image') ? [{
      key: 'download',
      icon: <DownloadOutlined />,
      label: 'Download',
      onClick: () => {
        const link = document.createElement('a');
        link.href = message.fileUrl;
        link.download = message.fileName || 'file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }] : []),
    {
      type: 'divider'
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      onClick: handleDeleteMessage,
      disabled: !isOwnMessage
    }
  ];

  const renderMessageContent = () => {
    if (message.failed) {
      return (
        <div style={{
          color: '#ff4d4f',
          fontStyle: 'italic'
        }}>
          Failed to send message
        </div>
      );
    }

    switch (message.type) {
      case 'text':
        return (
          <Text style={{ 
            color: isOwnMessage ? '#fff' : '#000',
            wordBreak: 'break-word'
          }}>
            {message.body}
          </Text>
        );
      
      case 'image':
        return (
          <div>
            <Image
              src={message.fileUrl}
              alt="Shared image"
              style={{ 
                maxWidth: '300px', 
                maxHeight: '300px',
                borderRadius: '8px'
              }}
              preview={{
                mask: false
              }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
            />
            {message.body && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ 
                  color: isOwnMessage ? '#fff' : '#000',
                  wordBreak: 'break-word'
                }}>
                  {message.body}
                </Text>
              </div>
            )}
          </div>
        );
      
      case 'file':
        
        return (
          <div>
            <Space>
              <Button
                type="link"
                href={message.fileUrl}
                target="_blank"
                download={message.fileName}
                style={{ 
                  color: isOwnMessage ? '#fff' : '#1890ff',
                  padding: 0
                }}
              >
                📄 {message.fileName || 'File'}
              </Button>
            </Space>
            {message.fileSize && (
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                {message.fileSize > 1024 * 1024 
                  ? `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : `${(message.fileSize / 1024).toFixed(1)} KB`
                }
              </div>
            )}
          </div>
        );
      
      default:
        return <Text>Unsupported message type</Text>;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        marginBottom: '12px',
        padding: '0 8px'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div style={{ 
        width: '40px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        {!isOwnMessage && showAvatar && (
          <Avatar 
            size={32}
            src={message.senderId.avatarUrl}
            icon={<UserOutlined />}
          />
        )}
      </div>

      {/* Message bubble */}
      <div
        style={{
          maxWidth: '70%',
          marginLeft: isOwnMessage ? '0' : '8px',
          marginRight: isOwnMessage ? '8px' : '0'
        }}
      >
        {/* Sender name (for group chats) */}
        {!isOwnMessage && showAvatar && (
          <div style={{ marginBottom: '4px', marginLeft: '12px' }}>
            <Text 
              strong 
              style={{ 
                fontSize: '12px',
                color: '#666'
              }}
            >
              {message.senderId.displayName}
            </Text>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {/* Message content */}
          <div
            style={{
              background: isOwnMessage ? '#1890ff' : '#fff',
              border: isOwnMessage ? 'none' : '1px solid #e8e8e8',
              borderRadius: '12px',
              padding: '8px 12px',
              position: 'relative',
              opacity: message.sending ? 0.7 : 1
            }}
          >
            {renderMessageContent()}
            
            {/* Message time */}
            <div
              style={{
                fontSize: '11px',
                color: isOwnMessage ? 'rgba(255,255,255,0.7)' : '#999',
                marginTop: '4px',
                textAlign: 'right'
              }}
            >
              {new Date(message.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              {message.sending && ' ⏳'}
              {message.failed && ' ❌'}
            </div>

            {/* Read receipts */}
            {isOwnMessage && !message.sending && !message.failed && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '4px'
                }}
              >
                <ReadReceipts
                  message={message}
                  conversationMembers={conversationMembers}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </div>

          {/* Message actions */}
          {showActions && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                [isOwnMessage ? 'left' : 'right']: '-40px',
                transform: 'translateY(-50%)',
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Dropdown
                menu={{ items: menuItems }}
                placement={isOwnMessage ? 'bottomLeft' : 'bottomRight'}
                trigger={['click']}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  style={{ border: 'none' }}
                />
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
const MemoizedMessageItem = React.memo(MessageItem, (prevProps, nextProps) => {
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.readBy?.length === nextProps.message.readBy?.length &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.showAvatar === nextProps.showAvatar
  );
});

export default MemoizedMessageItem;