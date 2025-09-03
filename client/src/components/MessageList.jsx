import React, { useMemo } from 'react';
import { List, Space, Typography } from 'antd';
import MessageItem from './MessageItem';

const { Text } = Typography;

const MessageList = ({ messages, currentUserId, conversationId, conversationMembers }) => {
  // Memoize expensive date grouping operation
  const groupedMessages = useMemo(() => {
    const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
    };

    return groupMessagesByDate(messages);
  }, [messages]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (messages.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        color: '#999'
      }}>
        <Text type="secondary">No messages yet. Start the conversation!</Text>
      </div>
    );
  }

  return (
    <div>
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Date separator */}
          <div style={{ 
            textAlign: 'center', 
            margin: '20px 0',
            position: 'relative'
          }}>
            <div style={{
              background: '#f0f0f0',
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#666'
            }}>
              {formatDate(group.date)}
            </div>
          </div>

          {/* Messages for this date */}
          {group.messages.map((message, messageIndex) => (
            <MessageItem
              key={message._id}
              message={message}
              isOwnMessage={message.senderId._id === currentUserId}
              showAvatar={
                messageIndex === 0 || 
                group.messages[messageIndex - 1].senderId._id !== message.senderId._id
              }
              conversationId={conversationId}
              conversationMembers={conversationMembers}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default React.memo(MessageList);