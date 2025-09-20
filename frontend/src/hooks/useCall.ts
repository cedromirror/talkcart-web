import { useState, useEffect, useCallback, useRef } from 'react';
import callService, { Call } from '@/services/callService';

interface UseCallReturn {
  // State
  currentCall: Call | null;
  incomingCall: Call | null;
  isCallActive: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isRecording: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  connectionStates: Map<string, RTCPeerConnectionState>;
  callHistory: Call[];
  missedCalls: Call[];
  activeCalls: Call[];
  loading: boolean;
  error: string | null;

  // Actions
  initiateCall: (conversationId: string, type: 'audio' | 'video') => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  transferCall: (targetUserId: string) => Promise<void>;
  acceptCallTransfer: (callId: string) => Promise<void>;
  declineCallTransfer: (callId: string) => Promise<void>;
  holdCall: (onHold: boolean) => Promise<void>;
  muteParticipant: (participantId: string, muted: boolean) => Promise<void>;
  getCallHistory: (conversationId: string) => Promise<void>;
  getMissedCalls: () => Promise<void>;
  getActiveCalls: () => Promise<void>;
  getWaitingQueue: () => Promise<void>;
  getCallStats: (period: string) => Promise<any>;
  markMissedCallsAsSeen: (callIds: string[]) => Promise<void>;
  reportCallQuality: (callId: string, quality: any) => Promise<void>;
  clearIncomingCall: () => void;
  clearError: () => void;
}

export const useCall = (): UseCallReturn => {
  // State
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const [missedCalls, setMissedCalls] = useState<Call[]>([]);
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event handlers
  const handleIncomingCall = useCallback((call: Call) => {
    console.log('Incoming call:', call);
    setIncomingCall(call);

    // Auto-decline after 30 seconds if not answered
    callTimeoutRef.current = setTimeout(() => {
      if (incomingCall && incomingCall.callId === call.callId) {
        declineCall(call.callId);
      }
    }, 30000);
  }, [incomingCall]);

  const handleRemoteStream = useCallback((data: { userId: string; stream: MediaStream }) => {
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(data.userId, data.stream);
      return newMap;
    });
  }, []);

  const handleConnectionStateChange = useCallback((data: {
    callId: string;
    userId: string;
    state: RTCPeerConnectionState
  }) => {
    setConnectionStates(prev => {
      const newMap = new Map(prev);
      newMap.set(data.userId, data.state);
      return newMap;
    });
  }, []);

  const handleParticipantJoined = useCallback((data: any) => {
    console.log('Participant joined:', data);
    if (currentCall && data.callId === currentCall.callId) {
      setCurrentCall(prev => prev ? { ...prev, ...data.call } : null);
    }
  }, [currentCall]);

  const handleParticipantLeft = useCallback((data: any) => {
    console.log('Participant left:', data);
    if (currentCall && data.callId === currentCall.callId) {
      setCurrentCall(prev => prev ? { ...prev, ...data.call } : null);

      // Remove remote stream
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    }
  }, [currentCall]);

  const handleCallEnded = useCallback((data: any) => {
    console.log('Call ended:', data);
    setCurrentCall(null);
    setIsCallActive(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setConnectionStates(new Map());

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const handleCallDeclined = useCallback((data: any) => {
    console.log('Call declined:', data);
    if (currentCall && data.callId === currentCall.callId) {
      setError('Call was declined');
    }
  }, [currentCall]);

  // Setup event listeners
  useEffect(() => {
    callService.on('incomingCall', handleIncomingCall);
    callService.on('remoteStream', handleRemoteStream);
    callService.on('connectionStateChange', handleConnectionStateChange);
    callService.on('participantJoined', handleParticipantJoined);
    callService.on('participantLeft', handleParticipantLeft);
    callService.on('callEnded', handleCallEnded);
    callService.on('callDeclined', handleCallDeclined);

    return () => {
      callService.off('incomingCall', handleIncomingCall);
      callService.off('remoteStream', handleRemoteStream);
      callService.off('connectionStateChange', handleConnectionStateChange);
      callService.off('participantJoined', handleParticipantJoined);
      callService.off('participantLeft', handleParticipantLeft);
      callService.off('callEnded', handleCallEnded);
      callService.off('callDeclined', handleCallDeclined);
    };
  }, [
    handleIncomingCall,
    handleRemoteStream,
    handleConnectionStateChange,
    handleParticipantJoined,
    handleParticipantLeft,
    handleCallEnded,
    handleCallDeclined
  ]);

  // Actions
  const initiateCall = useCallback(async (conversationId: string, type: 'audio' | 'video') => {
    try {
      setLoading(true);
      setError(null);

      // Get user media
      const stream = await callService.getUserMedia(type);
      setLocalStream(stream);
      setIsVideoEnabled(type === 'video');

      // Initiate call
      const call = await callService.initiateCall(conversationId, type);
      setCurrentCall(call);
      setIsCallActive(true);

      // Join the call
      await callService.joinCall(call.callId);

      // Create offers for all participants
      for (const participant of call.participants) {
        await callService.createOffer(call.callId, participant.userId.id);
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Error initiating call:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptCall = useCallback(async (callId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!incomingCall) {
        throw new Error('No incoming call to accept');
      }

      // Get user media
      const stream = await callService.getUserMedia(incomingCall.type);
      setLocalStream(stream);
      setIsVideoEnabled(incomingCall.type === 'video');

      // Join the call
      const call = await callService.joinCall(callId);
      setCurrentCall(call);
      setIncomingCall(null);
      setIsCallActive(true);

      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Error accepting call:', err);
    } finally {
      setLoading(false);
    }
  }, [incomingCall]);

  const declineCall = useCallback(async (callId: string) => {
    try {
      await callService.declineCall(callId);
      setIncomingCall(null);

      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error declining call:', err);
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      if (currentCall) {
        await callService.leaveCall(currentCall.callId);
      }

      setCurrentCall(null);
      setIsCallActive(false);
      setLocalStream(null);
      setRemoteStreams(new Map());
      setConnectionStates(new Map());

      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error ending call:', err);
    }
  }, [currentCall]);

  const toggleAudio = useCallback(() => {
    const enabled = callService.toggleAudio();
    setIsAudioEnabled(enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const enabled = callService.toggleVideo();
    setIsVideoEnabled(enabled);
  }, []);

  const getCallHistory = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const { calls } = await callService.getCallHistory(conversationId);
      setCallHistory(calls);
    } catch (err: any) {
      setError(err.message);
      console.error('Error getting call history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMissedCalls = useCallback(async () => {
    try {
      setLoading(true);
      const { missedCalls } = await callService.getMissedCalls();
      setMissedCalls(missedCalls);
    } catch (err: any) {
      setError(err.message);
      console.error('Error getting missed calls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getActiveCalls = useCallback(async () => {
    try {
      setLoading(true);
      const calls = await callService.getActiveCalls();
      setActiveCalls(calls);
    } catch (err: any) {
      setError(err.message);
      console.error('Error getting active calls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markMissedCallsAsSeen = useCallback(async (callIds: string[]) => {
    try {
      await callService.markMissedCallsAsSeen(callIds);
      // Remove marked calls from missed calls list
      setMissedCalls(prev => prev.filter(call => !callIds.includes(call.callId)));
    } catch (err: any) {
      setError(err.message);
      console.error('Error marking missed calls as seen:', err);
    }
  }, []);

  const reportCallQuality = useCallback(async (callId: string, quality: any) => {
    try {
      await callService.reportCallQuality(callId, quality);
    } catch (err: any) {
      setError(err.message);
      console.error('Error reporting call quality:', err);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!currentCall) {
      setError('No active call to record');
      return;
    }

    try {
      await callService.startRecording(currentCall.callId);
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message);
      console.error('Error starting recording:', err);
    }
  }, [currentCall]);

  const stopRecording = useCallback(async () => {
    if (!currentCall) {
      setError('No active call');
      return;
    }

    try {
      await callService.stopRecording(currentCall.callId);
      setIsRecording(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error stopping recording:', err);
    }
  }, [currentCall]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Transfer call methods
  const transferCall = useCallback(async (targetUserId: string) => {
    if (!currentCall) {
      setError('No active call to transfer');
      return;
    }

    try {
      await callService.transferCall(currentCall.callId, targetUserId);
    } catch (err: any) {
      setError(err.message);
      console.error('Error transferring call:', err);
    }
  }, [currentCall]);

  const acceptCallTransfer = useCallback(async (callId: string) => {
    try {
      await callService.acceptCallTransfer(callId);
    } catch (err: any) {
      setError(err.message);
      console.error('Error accepting call transfer:', err);
    }
  }, []);

  const declineCallTransfer = useCallback(async (callId: string) => {
    try {
      await callService.declineCallTransfer(callId);
    } catch (err: any) {
      setError(err.message);
      console.error('Error declining call transfer:', err);
    }
  }, []);

  // Hold call method
  const holdCall = useCallback(async (onHold: boolean) => {
    if (!currentCall) {
      setError('No active call to hold');
      return;
    }

    try {
      await callService.holdCall(currentCall.callId, onHold);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating hold status:', err);
    }
  }, [currentCall]);

  // Mute participant method
  const muteParticipant = useCallback(async (participantId: string, muted: boolean) => {
    if (!currentCall) {
      setError('No active call');
      return;
    }

    try {
      await callService.muteParticipant(currentCall.callId, participantId, muted);
    } catch (err: any) {
      setError(err.message);
      console.error('Error muting participant:', err);
    }
  }, [currentCall]);

  // Get waiting queue
  const getWaitingQueue = useCallback(async () => {
    try {
      setLoading(true);
      const waitingCalls = await callService.getWaitingQueue();
      // You might want to add a state for waiting calls
      console.log('Waiting calls:', waitingCalls);
    } catch (err: any) {
      setError(err.message);
      console.error('Error getting waiting queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get call statistics
  const getCallStats = useCallback(async (period: string = '30d') => {
    try {
      setLoading(true);
      const stats = await callService.getCallStats(period);
      return stats;
    } catch (err: any) {
      setError(err.message);
      console.error('Error getting call stats:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      if (currentCall) {
        callService.cleanupCall(currentCall.callId);
      }
    };
  }, [currentCall]);

  return {
    // State
    currentCall,
    incomingCall,
    isCallActive,
    isAudioEnabled,
    isVideoEnabled,
    isRecording,
    localStream,
    remoteStreams,
    connectionStates,
    callHistory,
    missedCalls,
    activeCalls,
    loading,
    error,

    // Actions
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startRecording,
    stopRecording,
    transferCall,
    acceptCallTransfer,
    declineCallTransfer,
    holdCall,
    muteParticipant,
    getCallHistory,
    getMissedCalls,
    getActiveCalls,
    getWaitingQueue,
    getCallStats,
    markMissedCallsAsSeen,
    reportCallQuality,
    clearIncomingCall,
    clearError
  };
};

export default useCall;