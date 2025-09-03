import { create } from 'zustand';

const useCallStore = create((set, get) => ({
  // Call state
  callState: 'idle', // 'idle' | 'ringing' | 'connecting' | 'active'
  currentCall: null, // { callId, participants, type, ... }
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  // Call controls
  isMuted: false,
  isCameraOn: true,
  isSpeakerOn: false,
  
  // Call history
  callHistory: [],
  
  // Incoming call
  incomingCall: null,
  
  // Error state
  error: null,
  
  // Actions
  setCallState: (state) => set({ callState: state }),
  
  setCurrentCall: (call) => set({ currentCall: call }),
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  
  setPeerConnection: (pc) => set({ peerConnection: pc }),
  
  setIncomingCall: (call) => set({ incomingCall: call }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  // Call controls
  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // Toggle enabled state
        set({ isMuted: !isMuted });
      }
    }
  },
  
  toggleCamera: () => {
    const { localStream, isCameraOn } = get();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn; // Toggle enabled state
        set({ isCameraOn: !isCameraOn });
      }
    }
  },
  
  toggleSpeaker: () => {
    set((state) => ({ isSpeakerOn: !state.isSpeakerOn }));
  },
  
  // Cleanup call
  cleanup: () => {
    const { localStream, remoteStream, peerConnection } = get();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop remote stream
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }
    
    set({
      callState: 'idle',
      currentCall: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isMuted: false,
      isCameraOn: true,
      isSpeakerOn: false,
      incomingCall: null,
      error: null
    });
  },
  
  // Add call to history
  addToHistory: (call) => {
    const { callHistory } = get();
    const newHistory = [call, ...callHistory].slice(0, 50); // Keep last 50 calls
    set({ callHistory: newHistory });
  },
  
  // WebRTC helpers
  createPeerConnection: async () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
    
    try {
      const pc = new RTCPeerConnection(configuration);
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate via socket
          const { currentCall } = get();
          if (currentCall && window.socketService) {
            window.socketService.sendICECandidate(currentCall.callId, event.candidate);
          }
        }
      };
      
      pc.ontrack = (event) => {
        console.log('✅ Received remote stream:', event.streams[0]);
        set({ remoteStream: event.streams[0] });
      };
      
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          set({ callState: 'active' });
          get().clearError();
        } else if (pc.connectionState === 'failed') {
          get().setError('Call connection failed');
          setTimeout(() => get().cleanup(), 3000);
        } else if (pc.connectionState === 'disconnected') {
          get().cleanup();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          get().setError('Network connection failed');
        }
      };
      
      set({ peerConnection: pc });
      return pc;
    } catch (error) {
      console.error('❌ Failed to create peer connection:', error);
      get().setError('Failed to initialize call');
      throw error;
    }
  },

  // Initialize call (make outgoing call)
  initiateCall: async (targetUserId, conversationId, type = 'voice') => {
    try {
      set({ callState: 'connecting', error: null });
      
      // Get user media
      const mediaConstraints = {
        audio: true,
        video: type === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      set({ localStream: stream });
      
      // Create peer connection and add stream
      const pc = await get().createPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send call initiation via socket (this will trigger call:initiated event back to us)
      if (window.socketService) {
        window.socketService.initiateCall(targetUserId, conversationId, type);
      }
      
      // Store call info temporarily until we get callId back
      set({ 
        currentCall: { 
          targetUserId, 
          conversationId, 
          type, 
          offer,
          status: 'initiating'
        } 
      });
      
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      get().setError(error.message || 'Failed to start call');
      get().cleanup();
    }
  },

  // Answer incoming call
  answerCall: async (callId) => {
    try {
      set({ callState: 'connecting', error: null });
      
      const call = get().currentCall || get().incomingCall;
      if (!call) {
        throw new Error('No call to answer');
      }
      
      // Just notify server that call is answered
      // WebRTC setup will happen when we receive the offer
      if (window.socketService) {
        window.socketService.answerCall(callId);
      }
      
    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      get().setError(error.message || 'Failed to answer call');
      get().cleanup();
    }
  }
}));

export default useCallStore;