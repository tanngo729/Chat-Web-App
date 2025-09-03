import { useEffect } from 'react';
import { useMessageStore, useConversationStore, usePresenceStore, useUIStore, useCallStore, useAuthStore } from '../stores';
import socketService from '../services/socket';

const useSocketIntegration = () => {
  // Request notification permission on first load
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('✅ Notification permission granted');
          } else {
            console.log('❌ Notification permission denied');
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      }
    };
    
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Message events
    const handleMessageNew = (data) => {
      const { message } = data;
      const { addMessage } = useMessageStore.getState();
      const { updateLastMessage, activeConversationId } = useConversationStore.getState();
      
      addMessage(message);
      updateLastMessage(message.conversationId, message);
      
      // Only show notification if user is NOT actively viewing this conversation
      // OR if the window is not focused (user might be in another app)
      const isActiveConversation = activeConversationId === message.conversationId;
      const isWindowFocused = !document.hidden && document.hasFocus();
      const shouldNotify = !isActiveConversation || !isWindowFocused;
      
      if (shouldNotify && Notification.permission === 'granted') {
        const notification = new Notification(`New message from ${message.senderId.displayName}`, {
          body: message.body,
          icon: message.senderId.avatarUrl || '/default-avatar.png',
          tag: `msg_${message.conversationId}` // Use tag to replace previous notifications
        });
        
        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        // Navigate to conversation and mark as read when user clicks
        notification.onclick = async () => {
          window.focus();
          notification.close();
          
          // Navigate to the conversation
          const { setActiveConversation, markConversationAsRead } = useConversationStore.getState();
          setActiveConversation(message.conversationId);
          
          // Mark conversation as read
          try {
            await markConversationAsRead(message.conversationId);
            console.log('✅ Conversation marked as read via notification click');
          } catch (error) {
            console.error('❌ Failed to mark conversation as read:', error);
          }
        };
      }
    };

    const handleMessageAck = (data) => {
      const { tempId, message } = data;
      const { confirmMessage } = useMessageStore.getState();
      confirmMessage(tempId, message);
    };

    const handleMessageError = (data) => {
      const { tempId, error } = data;
      console.error('Message error:', error);
    };

    const handleMessageRead = (data) => {
      const { messageId, userId, readAt } = data;
      const { updateReadReceipt } = useMessageStore.getState();
      updateReadReceipt(messageId, userId, readAt);
    };

    // Typing events
    const handleTyping = (data) => {
      const { conversationId, userId, displayName, isTyping } = data;
      const { setTyping } = usePresenceStore.getState();
      setTyping(conversationId, userId, displayName, isTyping);
    };

    // Presence events
    const handlePresenceUpdate = (data) => {
      const { userId, status, lastActiveAt } = data;
      const { updateUserPresence } = usePresenceStore.getState();
      updateUserPresence(userId, { status, lastActiveAt });
    };

    // Conversation events - LIMITED TO PREVENT SPAM
    let conversationUpdateTimeout = null;
    const handleConversationUpdated = (data) => {
      const { conversationId, lastReadAt } = data;
      if (conversationId && lastReadAt) {
        // Debounce to prevent spam updates
        if (conversationUpdateTimeout) {
          clearTimeout(conversationUpdateTimeout);
        }
        conversationUpdateTimeout = setTimeout(() => {
          const { updateConversation } = useConversationStore.getState();
          updateConversation(conversationId, { lastReadAt });
          console.log('✅ Conversation read status updated:', conversationId);
        }, 100); // 100ms debounce
      }
    };

    // Socket connection events
    const handleSocketConnected = () => {
      console.log('Socket connected');
    };

    const handleSocketDisconnected = (reason) => {
      console.log('Socket disconnected:', reason);
    };

    const handleSocketError = (error) => {
      console.error('Socket error:', error);
    };

    const handleSocketReconnected = (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      const { showInfo } = useUIStore.getState();
      showInfo('Connection restored');
      
      // Refresh conversations and active conversation messages to sync missed data
      const { fetchConversations, activeConversationId } = useConversationStore.getState();
      const { fetchMessages } = useMessageStore.getState();
      
      fetchConversations();
      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    };

    const handleSocketReconnectFailed = () => {
      console.error('Socket reconnection failed');
    };

    // Call events
    const handleCallRinging = async (data) => {
      console.log('📞 Incoming call:', data);
      const { setIncomingCall, setCallState, setCurrentCall } = useCallStore.getState();
      setCallState('ringing');
      
      const incomingCallData = {
        callId: data.callId,
        from: data.from.userId,
        name: data.from.displayName,
        avatar: data.from.avatarUrl,
        userId: data.from.userId,
        conversationId: data.conversationId,
        type: data.type
      };
      
      setIncomingCall(incomingCallData);
      setCurrentCall(incomingCallData);
    };

    const handleCallAnswered = async (data) => {
      console.log('✅ Call answered:', data);
      const { setCallState, currentCall, peerConnection } = useCallStore.getState();
      
      if (currentCall?.callId === data.callId) {
        setCallState('connecting');
        
        // If we are the initiator and have peer connection with offer, send it now
        if (peerConnection && peerConnection.localDescription && window.socketService) {
          console.log('📤 Sending offer after call answered');
          window.socketService.sendCallOffer(data.callId, peerConnection.localDescription);
        }
      }
    };

    const handleCallRejected = (data) => {
      console.log('❌ Call rejected:', data);
      const { cleanup } = useCallStore.getState();
      cleanup();
    };

    const handleCallHangup = (data) => {
      console.log('📴 Call ended:', data);
      const { cleanup } = useCallStore.getState();
      cleanup();
    };

    const handleCallInitiated = (data) => {
      console.log('📞 Call initiated:', data);
      const { setCurrentCall, setCallState, currentCall } = useCallStore.getState();
      setCallState('connecting');
      
      // We need to get the target user info from conversation or somewhere else
      // For now, we'll use the data passed from the component
      const { activeConversation } = useConversationStore.getState();
      let targetUser = null;
      
      if (activeConversation && activeConversation.type === 'direct') {
        const { user } = useAuthStore.getState();
        targetUser = activeConversation.members.find(member => member._id !== user._id);
      }
      
      const updatedCall = {
        callId: data.callId,
        userId: data.targetUserId,
        name: targetUser?.displayName || 'Unknown User',
        avatar: targetUser?.avatarUrl,
        type: data.type,
        status: data.status,
        conversationId: activeConversation?._id
      };
      
      setCurrentCall(updatedCall);
      
      // If we have a stored offer from initiateCall, send it now
      if (currentCall?.offer && window.socketService) {
        window.socketService.sendCallOffer(data.callId, currentCall.offer);
      }
    };

    const handleCallError = (data) => {
      console.error('❌ Call error:', data);
      const { setError } = useCallStore.getState();
      setError(data.error);
    };

    const handleCallCandidate = (data) => {
      console.log('🔗 ICE candidate received:', data);
      const { peerConnection } = useCallStore.getState();
      if (peerConnection && data.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(err => console.error('Error adding ICE candidate:', err));
      }
    };

    const handleCallOffer = async (data) => {
      console.log('📥 Call offer received:', data);
      const { peerConnection, currentCall, localStream, createPeerConnection, setLocalStream } = useCallStore.getState();
      
      if (data.offer && currentCall?.callId === data.callId) {
        try {
          let pc = peerConnection;
          
          // Create peer connection if not exists (for receiver)
          if (!pc) {
            pc = await createPeerConnection();
            
            // Get user media for receiver
            if (!localStream && currentCall.type === 'video') {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
              });
              setLocalStream(stream);
              
              // Add stream to peer connection
              stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
              });
            }
          }
          
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          // Create answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Send answer back
          if (window.socketService) {
            window.socketService.sendCallAnswer(data.callId, answer);
          }
        } catch (err) {
          console.error('Error handling call offer:', err);
        }
      }
    };

    const handleCallAnswerSignal = async (data) => {
      console.log('📤 Call answer received:', data);
      const { peerConnection, currentCall } = useCallStore.getState();
      
      if (peerConnection && data.answer && currentCall?.callId === data.callId) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ WebRTC connection established');
        } catch (err) {
          console.error('Error handling call answer:', err);
        }
      }
    };

    // Clear notifications when window gets focus or user changes conversation
    const clearNotificationsForConversation = (conversationId) => {
      // Close notifications with specific tag
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            if (registration.showNotification) {
              // This would work with service worker notifications
            }
          });
        });
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Clear all notifications when user comes back to app
        const { activeConversationId } = useConversationStore.getState();
        if (activeConversationId) {
          clearNotificationsForConversation(activeConversationId);
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Register event listeners
    socketService.on('message:new', handleMessageNew);
    socketService.on('message:ack', handleMessageAck);
    socketService.on('message:error', handleMessageError);
    socketService.on('message:read', handleMessageRead);
    socketService.on('typing', handleTyping);
    socketService.on('presence:update', handlePresenceUpdate);
    socketService.on('conversation:updated', handleConversationUpdated);
    socketService.on('socket:connected', handleSocketConnected);
    socketService.on('socket:disconnected', handleSocketDisconnected);
    socketService.on('socket:error', handleSocketError);
    socketService.on('socket:reconnected', handleSocketReconnected);
    socketService.on('socket:reconnect_failed', handleSocketReconnectFailed);
    
    // Call event listeners
    socketService.on('call:ringing', handleCallRinging);
    socketService.on('call:answered', handleCallAnswered);
    socketService.on('call:rejected', handleCallRejected);
    socketService.on('call:hangup', handleCallHangup);
    socketService.on('call:initiated', handleCallInitiated);
    socketService.on('call:error', handleCallError);
    socketService.on('call:candidate', handleCallCandidate);
    socketService.on('call:offer', handleCallOffer);
    socketService.on('call:answer-signal', handleCallAnswerSignal);

    // Cleanup function
    return () => {
      if (conversationUpdateTimeout) {
        clearTimeout(conversationUpdateTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socketService.off('message:new', handleMessageNew);
      socketService.off('message:ack', handleMessageAck);
      socketService.off('message:error', handleMessageError);
      socketService.off('message:read', handleMessageRead);
      socketService.off('typing', handleTyping);
      socketService.off('presence:update', handlePresenceUpdate);
      socketService.off('conversation:updated', handleConversationUpdated);
      socketService.off('socket:connected', handleSocketConnected);
      socketService.off('socket:disconnected', handleSocketDisconnected);
      socketService.off('socket:error', handleSocketError);
      socketService.off('socket:reconnected', handleSocketReconnected);
      socketService.off('socket:reconnect_failed', handleSocketReconnectFailed);
      
      // Remove call event listeners
      socketService.off('call:ringing', handleCallRinging);
      socketService.off('call:answered', handleCallAnswered);
      socketService.off('call:rejected', handleCallRejected);
      socketService.off('call:hangup', handleCallHangup);
      socketService.off('call:initiated', handleCallInitiated);
      socketService.off('call:error', handleCallError);
      socketService.off('call:candidate', handleCallCandidate);
      socketService.off('call:offer', handleCallOffer);
      socketService.off('call:answer-signal', handleCallAnswerSignal);
    };
  }, []); // No dependencies - only run once!

  // Presence ping interval
  useEffect(() => {
    const interval = setInterval(() => {
      socketService.sendPresencePing();
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return null; // This hook doesn't render anything
};

export default useSocketIntegration;