// src/contexts/VoiceCallContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Call, VoiceCallState } from '@/types';
import { useAuth } from './AuthContext';

interface VoiceCallContextType extends VoiceCallState {
  initiateCall: (receiverId: string, roomId: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  incomingCall: Call | null;
}

const VoiceCallContext = createContext<VoiceCallContextType | undefined>(undefined);

// ICE servers configuration (using free STUN servers)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const VoiceCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [state, setState] = useState<VoiceCallState>({
    isInCall: false,
    isMuted: false,
    callId: null,
    remotePeerId: null,
    localStream: null,
    remoteStream: null,
    callStatus: 'idle',
  });

  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callUnsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Initialize local media stream
   */
  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }, []);

  /**
   * Create peer connection
   */
  const createPeerConnection = useCallback((callId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        const callRef = doc(db, 'calls', callId);
        const field = isInitiator ? 'iceCandidates.caller' : 'iceCandidates.receiver';
        
        try {
          const currentDoc = await getDoc(callRef);
          const currentCandidates = currentDoc.data()?.[field.split('.')[0]]?.[field.split('.')[1]] || [];
          
          await updateDoc(callRef, {
            [field]: [...currentCandidates, event.candidate.toJSON()],
          });
        } catch (error) {
          console.error('Error saving ICE candidate:', error);
        }
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      setState((prev) => ({
        ...prev,
        remoteStream: event.streams[0],
      }));
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setState((prev) => ({ ...prev, callStatus: 'connected' }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [user]);

  /**
   * Initiate a call
   */
  const initiateCall = useCallback(async (receiverId: string, roomId: string) => {
    if (!user) return;

    try {
      setState((prev) => ({ ...prev, callStatus: 'calling' }));

      // Get local stream
      const localStream = await getLocalStream();
      setState((prev) => ({ ...prev, localStream }));

      // Create call document
      const callId = `call_${Date.now()}_${user.uid}`;
      const callRef = doc(db, 'calls', callId);

      await setDoc(callRef, {
        id: callId,
        roomId,
        callerId: user.uid,
        receiverId,
        status: 'ringing',
        startedAt: serverTimestamp(),
        iceCandidates: {
          caller: [],
          receiver: [],
        },
      });

      setState((prev) => ({
        ...prev,
        isInCall: true,
        callId,
        remotePeerId: receiverId,
      }));

      // Create peer connection
      const pc = createPeerConnection(callId, true);

      // Add local stream to peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Create and set offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Save offer to Firestore
      await updateDoc(callRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      // Listen for answer
      callUnsubscribeRef.current = onSnapshot(callRef, async (snapshot) => {
        const callData = snapshot.data() as Call;

        if (callData.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(callData.answer));
        }

        // Add ICE candidates from receiver
        if (callData.iceCandidates?.receiver) {
          for (const candidate of callData.iceCandidates.receiver) {
            if (!pc.remoteDescription) continue;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
        }

        // Handle call status changes
        if (callData.status === 'declined' || callData.status === 'missed') {
          endCall();
        }
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      setState((prev) => ({ ...prev, callStatus: 'idle', isInCall: false }));
    }
  }, [user, getLocalStream, createPeerConnection]);

  /**
   * Accept incoming call
   */
  const acceptCall = useCallback(async (callId: string) => {
    if (!user || !incomingCall) return;

    try {
      setState((prev) => ({ ...prev, callStatus: 'calling' }));

      // Get local stream
      const localStream = await getLocalStream();
      setState((prev) => ({ ...prev, localStream }));

      // Update call status
      const callRef = doc(db, 'calls', callId);
      await updateDoc(callRef, { status: 'active' });

      setState((prev) => ({
        ...prev,
        isInCall: true,
        callId,
        remotePeerId: incomingCall.callerId,
      }));

      // Create peer connection
      const pc = createPeerConnection(callId, false);

      // Add local stream
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Set remote description from offer
      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      }

      // Create and set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Save answer to Firestore
      await updateDoc(callRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      // Listen for ICE candidates from caller
      callUnsubscribeRef.current = onSnapshot(callRef, async (snapshot) => {
        const callData = snapshot.data() as Call;

        if (callData.iceCandidates?.caller) {
          for (const candidate of callData.iceCandidates.caller) {
            if (!pc.remoteDescription) continue;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
        }
      });

      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      setState((prev) => ({ ...prev, callStatus: 'idle', isInCall: false }));
    }
  }, [user, incomingCall, getLocalStream, createPeerConnection]);

  /**
   * Decline incoming call
   */
  const declineCall = useCallback(async (callId: string) => {
    try {
      const callRef = doc(db, 'calls', callId);
      await updateDoc(callRef, {
        status: 'declined',
        endedAt: serverTimestamp(),
      });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  }, []);

  /**
   * End active call
   */
  const endCall = useCallback(async () => {
    try {
      // Stop local stream
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Update call status
      if (state.callId) {
        const callRef = doc(db, 'calls', state.callId);
        await updateDoc(callRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
        });
      }

      // Unsubscribe from call updates
      if (callUnsubscribeRef.current) {
        callUnsubscribeRef.current();
        callUnsubscribeRef.current = null;
      }

      // Reset state
      setState({
        isInCall: false,
        isMuted: false,
        callId: null,
        remotePeerId: null,
        localStream: null,
        remoteStream: null,
        callStatus: 'idle',
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [state.callId, state.localStream]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (state.localStream) {
      const audioTrack = state.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, [state.localStream]);

  /**
   * Listen for incoming calls
   */
  useEffect(() => {
    if (!user) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const call = { id: change.doc.id, ...change.doc.data() } as Call;
          setIncomingCall(call);
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (state.isInCall) {
        endCall();
      }
    };
  }, []);

  const value: VoiceCallContextType = {
    ...state,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    incomingCall,
  };

  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
};

export const useVoiceCall = () => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within VoiceCallProvider');
  }
  return context;
};
