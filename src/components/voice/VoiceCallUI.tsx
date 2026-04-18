// src/components/voice/VoiceCallUI.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { Phone, PhoneOff, Mic, MicOff, Minimize2, Maximize2 } from 'lucide-react';

const VoiceCallUI: React.FC = () => {
  const {
    isInCall,
    isMuted,
    callStatus,
    remoteStream,
    localStream,
    endCall,
    toggleMute,
    acceptCall,
    declineCall,
    incomingCall,
  } = useVoiceCall();

  const [isMinimized, setIsMinimized] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  /**
   * Setup audio element for remote stream
   */
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /**
   * Audio level visualization
   */
  useEffect(() => {
    if (!localStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(localStream);
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
      }
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [localStream]);

  /**
   * Remote audio level
   */
  useEffect(() => {
    if (!remoteStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(remoteStream);
    source.connect(analyser);
    remoteAnalyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (remoteAnalyserRef.current) {
        remoteAnalyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setRemoteAudioLevel(average / 255);
      }
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [remoteStream]);

  /**
   * Format call duration
   */
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (callStatus !== 'connected') {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Incoming Call UI
   */
  if (incomingCall && !isInCall) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center animate-pulse">
              <Phone className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Incoming Call</h2>
            <p className="text-gray-400 mb-8">Caller ID: {incomingCall.callerId}</p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => declineCall(incomingCall.id)}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 rounded-full transition flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5 text-white" />
                <span className="text-white font-medium">Decline</span>
              </button>

              <button
                onClick={() => acceptCall(incomingCall.id)}
                className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-full transition flex items-center gap-2"
              >
                <Phone className="w-5 h-5 text-white" />
                <span className="text-white font-medium">Accept</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Active Call UI
   */
  if (!isInCall) return null;

  return (
    <>
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} muted />
      <audio ref={remoteAudioRef} autoPlay />

      {/* Floating Call Window */}
      <div
        className={`fixed ${
          isMinimized ? 'bottom-4 right-4 w-64' : 'bottom-4 right-4 w-80'
        } bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">
              {callStatus === 'calling' ? 'Calling...' : 
               callStatus === 'ringing' ? 'Ringing...' : 
               'In Call'}
            </h3>
            {callStatus === 'connected' && (
              <p className="text-sm text-gray-400">{formatDuration(duration)}</p>
            )}
          </div>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {!isMinimized && (
          <>
            {/* Audio Visualizer */}
            <div className="p-6 flex items-center justify-center gap-8">
              {/* Local Audio */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isMuted ? 'bg-gray-700' : 'bg-purple-600'
                  }`}
                  style={{
                    boxShadow: !isMuted
                      ? `0 0 ${audioLevel * 40}px rgba(147, 51, 234, 0.6)`
                      : 'none',
                  }}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </div>
                <p className="text-xs text-gray-400">You</p>
              </div>

              {/* Remote Audio */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center transition-all"
                  style={{
                    boxShadow: `0 0 ${remoteAudioLevel * 40}px rgba(59, 130, 246, 0.6)`,
                  }}
                >
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs text-gray-400">Remote</p>
              </div>
            </div>

            {/* Audio Bars Visualization */}
            <div className="px-6 pb-4 flex justify-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(
                      4,
                      Math.random() * audioLevel * 32 + Math.random() * remoteAudioLevel * 32
                    )}px`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Controls */}
        <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={endCall}
            className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </>
  );
};

export default VoiceCallUI;
