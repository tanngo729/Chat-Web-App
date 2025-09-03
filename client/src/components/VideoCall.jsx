import React, { useEffect, useRef } from 'react';
import { Modal, Button, Space, Typography, Spin, Avatar, message } from 'antd';
import { 
  PhoneOutlined, 
  VideoCameraOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  StopOutlined 
} from '@ant-design/icons';
import { useCallStore } from '../stores';
import socketService from '../services/socket';

const { Title, Text } = Typography;

const VideoCall = ({ 
  isOpen, 
  onClose, 
  callData, 
  currentUserId,
  isIncoming = false,
  onAccept,
  onDecline 
}) => {
  const { 
    callState, 
    localStream, 
    remoteStream,
    isMuted, 
    isCameraOn, 
    toggleMute, 
    toggleCamera,
    cleanup,
    answerCall
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Set up video streams
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (onAccept) onAccept();
    if (callData?.callId) {
      await answerCall(callData.callId);
    }
  };

  // Handle call decline
  const handleDeclineCall = () => {
    if (onDecline) onDecline();
    handleEndCall();
  };

  // End call
  const handleEndCall = () => {
    // Notify other party
    if (callData?.callId) {
      socketService.hangupCall(callData.callId);
    }
    
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onCancel={handleEndCall}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { padding: 0, height: '80vh' } }}
      closable={false}
      maskClosable={false}
    >
      <div style={{ 
        height: '100%', 
        background: '#000', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Remote Video (Main) */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              color: 'white',
              gap: '20px'
            }}>
              <Avatar size={120} src={callData?.avatar}>
                {callData?.name?.charAt(0)}
              </Avatar>
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                {isIncoming ? `${callData?.name} is calling...` : `Calling ${callData?.name}...`}
              </Title>
              {(callState === 'connecting' || callState === 'ringing') && (
                <Space>
                  <Spin size="large" />
                  <Text style={{ color: 'white' }}>
                    {isIncoming ? 'Incoming call' : 'Connecting...'}
                  </Text>
                </Space>
              )}
            </div>
          )}
          
          {/* Local Video (Picture-in-Picture) */}
          {localStream && (
            <div style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 200,
              height: 150,
              borderRadius: 10,
              overflow: 'hidden',
              border: '2px solid white'
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
            </div>
          )}
        </div>
        
        {/* Call Controls */}
        <div style={{
          padding: '20px',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}>
          {isIncoming && callState === 'ringing' ? (
            // Incoming call controls
            <Space size="large">
              <Button
                type="primary"
                danger
                shape="circle"
                size="large"
                icon={<PhoneOutlined />}
                onClick={handleDeclineCall}
                style={{ 
                  background: '#ff4d4f',
                  borderColor: '#ff4d4f',
                  width: 60,
                  height: 60
                }}
              />
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={handleAcceptCall}
                style={{ 
                  background: '#52c41a',
                  borderColor: '#52c41a',
                  width: 60,
                  height: 60
                }}
              />
            </Space>
          ) : (
            // Active call controls
            <Space size="large">
              <Button
                type={isMuted ? "primary" : "default"}
                shape="circle"
                size="large"
                icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                onClick={toggleMute}
                danger={isMuted}
                style={{ width: 50, height: 50 }}
              />
              <Button
                type={!isCameraOn ? "primary" : "default"}
                shape="circle"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={toggleCamera}
                danger={!isCameraOn}
                style={{ width: 50, height: 50 }}
              />
              <Button
                type="primary"
                danger
                shape="circle"
                size="large"
                icon={<StopOutlined />}
                onClick={handleEndCall}
                style={{ width: 60, height: 60 }}
              />
            </Space>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VideoCall;