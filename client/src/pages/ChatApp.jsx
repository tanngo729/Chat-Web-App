import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { useAuthStore, useConversationStore } from '../stores';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import useSocketIntegration from '../hooks/useSocketIntegration';
import socketService from '../services/socket';

const { Content } = Layout;

const ChatApp = () => {
  const { token, user } = useAuthStore();
  const { fetchConversations } = useConversationStore();

  // Initialize socket integration
  useSocketIntegration();

  useEffect(() => {
    // Connect to socket
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    // Fetch conversations
    fetchConversations();
  }, [token, fetchConversations]);

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Content>
        <ChatArea />
      </Content>
    </Layout>
  );
};

export default ChatApp;