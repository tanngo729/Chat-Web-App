import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Upload, App, Typography } from 'antd';
import { 
  SendOutlined, 
  PaperClipOutlined, 
  SmileOutlined,
  PictureOutlined 
} from '@ant-design/icons';
import { useAuthStore, useMessageStore, usePresenceStore, useConversationStore } from '../stores';
import socketService from '../services/socket';
import { uploadAPI } from '../services/api';

const { Text } = Typography;

const { TextArea } = Input;

const MessageComposer = ({ conversationId, onMessageSent }) => {
  const { user } = useAuthStore();
  const { sendMessage } = useMessageStore();
  const { getTypingText } = usePresenceStore();
  const { message } = App.useApp();
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const typingText = getTypingText(conversationId);

  // Handle typing indicators
  useEffect(() => {
    if (messageText.trim() && !isTyping) {
      setIsTyping(true);
      socketService.startTyping(conversationId);
      
      // Auto-mark conversation as read when user starts typing
      const markAsRead = async () => {
        try {
          const { markConversationAsRead } = useConversationStore.getState();
          await markConversationAsRead(conversationId);
        } catch (error) {
          console.error('Failed to mark conversation as read while typing:', error);
        }
      };
      markAsRead();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketService.stopTyping(conversationId);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messageText, conversationId, isTyping]);

  // Clean up typing on unmount
  useEffect(() => {
    return () => {
      if (isTyping) {
        socketService.stopTyping(conversationId);
      }
    };
  }, [conversationId, isTyping]);

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text || sending) return;

    setSending(true);
    setMessageText('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping(conversationId);
    }

    try {
      await sendMessage(conversationId, {
        body: text,
        type: 'text',
        senderId: user._id
      });
      
      onMessageSent?.();
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (file) => {
    // Validate file size (50MB limit)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
      message.error('File size too large. Maximum allowed size is 50MB.');
      return false;
    }
    
    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      message.error(`File type ${file.type} is not supported.`);
      return false;
    }
    
    setUploading(true);
    const uploadingMessage = message.loading('Uploading file...', 0);
    
    try {
      // Upload file to server
      const response = await uploadAPI.single(file);
      
      // Check if response is successful
      if (!response?.data?.data || !response.data.data.fileUrl) {
        console.error('Upload response:', response);
        throw new Error('Invalid response from server');
      }
      
      const { fileUrl, fileName, fileSize, type, meta } = response.data.data;
      
      // Determine message type based on file type
      let messageType = type || 'file';
      
      // Send message with uploaded file
      await sendMessage(conversationId, {
        body: '', // Optional caption
        type: messageType,
        fileUrl,
        fileName: fileName || file.name,
        fileSize: fileSize || file.size,
        meta: meta || { mime: file.type },
        senderId: user._id
      });
      
      onMessageSent?.();
      uploadingMessage(); // Close loading message
      message.success(`${messageType.charAt(0).toUpperCase() + messageType.slice(1)} sent successfully`);
      
    } catch (error) {
      console.error('Failed to upload file:', error);
      uploadingMessage(); // Close loading message
      
      let errorMessage = 'Failed to upload file';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 413) {
          errorMessage = 'File too large for server';
        } else if (error.response.status === 415) {
          errorMessage = 'File type not supported';
        } else if (error.response.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error - please check your connection';
      } else {
        // Other error
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      message.error(errorMessage);
    } finally {
      setUploading(false);
    }
    
    return false; // Prevent default upload
  };

  return (
    <div style={{
      padding: '16px 24px',
      background: '#fff',
      borderTop: '1px solid #f0f0f0'
    }}>
      <Space.Compact style={{ width: '100%' }}>
        <div style={{ 
          flex: 1, 
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          background: '#f8f8f8',
          borderRadius: '8px',
          padding: '8px 12px'
        }}>
          <TextArea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            variant="borderless"
            style={{ 
              background: 'transparent',
              resize: 'none'
            }}
          />
          
          <div style={{ 
            marginLeft: '8px',
            display: 'flex',
            gap: '4px'
          }}>
            <Upload
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept="image/*,.pdf,.doc,.docx,.txt"
            >
              <Button
                type="text"
                size="small"
                icon={<PictureOutlined />}
                loading={uploading}
                disabled={sending}
              />
            </Upload>
            
            <Upload
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <Button
                type="text"
                size="small"
                icon={<PaperClipOutlined />}
                loading={uploading}
                disabled={sending}
              />
            </Upload>
            
            <Button
              type="text"
              size="small"
              icon={<SmileOutlined />}
              disabled={sending}
            />
          </div>
        </div>
        
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          loading={sending}
          disabled={!messageText.trim() || uploading}
          style={{ 
            height: 'auto',
            minHeight: '40px',
            marginLeft: '8px',
            borderRadius: '8px'
          }}
        />
      </Space.Compact>
      
      {/* Typing indicator */}
      <div style={{ 
        height: '20px', 
        fontSize: '12px', 
        color: '#999',
        marginTop: '4px'
      }}>
        {typingText && (
          <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
            {typingText}
          </Text>
        )}
      </div>
    </div>
  );
};

export default MessageComposer;