import React, { useEffect, useRef, useState } from 'react';
import { Layout, Typography, Empty, Button, Spin } from 'antd';
import { useConversationStore, useMessageStore, useAuthStore } from '../stores';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import socketService from '../services/socket';

const { Content } = Layout;
const { Title } = Typography;

const ChatArea = () => {
  const { user } = useAuthStore();
  const { activeConversationId, getActiveConversation } = useConversationStore();
  const { fetchMessages, getMessages, getConversationData, hasMoreMessages, isLoading } = useMessageStore();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const markAsReadTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  // Auto-mark as read when conversation becomes active
  useEffect(() => {
    if (activeConversationId) {
      const markAsRead = async () => {
        try {
          const { markConversationAsRead } = useConversationStore.getState();
          await markConversationAsRead(activeConversationId);
        } catch (error) {
          console.error('Failed to mark conversation as read on open:', error);
        }
      };
      // Small delay to ensure conversation is fully loaded
      setTimeout(markAsRead, 100);
    }
  }, [activeConversationId]);

  const activeConversation = getActiveConversation();
  const messages = getMessages(activeConversationId);
  const conversationData = getConversationData(activeConversationId);
  const hasMore = hasMoreMessages(activeConversationId);
  const loadingMore = isLoading(activeConversationId, conversationData?.cursor);
  const loadingInitial = isLoading(activeConversationId);

  // Join conversation room when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      socketService.joinConversation(activeConversationId);
      fetchMessages(activeConversationId);
      setShouldScrollToBottom(true);
    }

    return () => {
      if (activeConversationId) {
        socketService.leaveConversation(activeConversationId);
      }
    };
  }, [activeConversationId, fetchMessages]);

  // Auto-scroll to bottom for new messages when user is near bottom
  useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0) {
      scrollToBottom();
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  // Check if user is near bottom of conversation
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNear = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(isNear);

    // Debounced mark as read when user scrolls (indicates activity)
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }
    markAsReadTimeoutRef.current = setTimeout(async () => {
      try {
        const { markConversationAsRead } = useConversationStore.getState();
        await markConversationAsRead(activeConversationId);
      } catch (error) {
        console.error('Failed to mark conversation as read on scroll:', error);
      }
    }, 500); // Mark as read 500ms after user stops scrolling

    // Load more messages when scrolling to top
    if (scrollTop === 0 && hasMore && !loadingMore) {
      const oldScrollHeight = scrollHeight;
      fetchMessages(activeConversationId, conversationData?.cursor).then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
          }
        });
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = () => {
    if (isNearBottom) {
      setShouldScrollToBottom(true);
    }
  };

  if (!activeConversationId) {
    return (
      <Layout style={{ height: '100%' }}>
        <Content 
          style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#fafafa'
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                Select a conversation to start chatting
              </span>
            }
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100%' }}>
      <ChatHeader conversation={activeConversation} />
      
      <Content style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: 'calc(100vh - 64px - 80px)', // Subtract header and composer height
        background: '#fafafa'
      }}>
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          onClick={async () => {
            // Mark as read when user clicks anywhere in chat area
            try {
              const { markConversationAsRead } = useConversationStore.getState();
              await markConversationAsRead(activeConversationId);
            } catch (error) {
              console.error('Failed to mark conversation as read on click:', error);
            }
          }}
          style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '16px',
            position: 'relative'
          }}
        >
          {/* Loading indicator for older messages */}
          {hasMore && (
            <div style={{ 
              textAlign: 'center', 
              padding: '16px 0',
              position: 'sticky',
              top: 0,
              background: '#fafafa',
              zIndex: 1
            }}>
              {loadingMore ? (
                <Spin size="small" />
              ) : (
                <Button 
                  size="small" 
                  type="text" 
                  onClick={() => {
                    const oldScrollHeight = messagesContainerRef.current?.scrollHeight;
                    fetchMessages(activeConversationId, conversationData?.cursor).then(() => {
                      requestAnimationFrame(() => {
                        if (messagesContainerRef.current && oldScrollHeight) {
                          const newScrollHeight = messagesContainerRef.current.scrollHeight;
                          messagesContainerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
                        }
                      });
                    });
                  }}
                >
                  Load older messages
                </Button>
              )}
            </div>
          )}

          {loadingInitial && messages.length === 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px'
            }}>
              <Spin />
            </div>
          ) : (
            <MessageList 
              messages={messages} 
              currentUserId={user._id}
              conversationId={activeConversationId}
              conversationMembers={activeConversation?.members || []}
            />
          )}
          
          <div ref={messagesEndRef} />

          {/* Scroll to bottom button */}
          {!isNearBottom && messages.length > 0 && (
            <Button
              type="primary"
              shape="circle"
              size="small"
              onClick={() => setShouldScrollToBottom(true)}
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              ↓
            </Button>
          )}
        </div>
        
        <MessageComposer 
          conversationId={activeConversationId}
          onMessageSent={handleNewMessage}
        />
      </Content>
    </Layout>
  );
};

export default ChatArea;