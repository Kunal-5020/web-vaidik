'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import callService from '@/lib/callService';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

export default function CallScreen() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, openLoginModal } = useAuth();
  
  const sessionId = params.sessionId as string;
  
  // Call State
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [astrologerName, setAstrologerName] = useState('Astrologer');
  const [callRate, setCallRate] = useState(0);
  
  // Timer State
  const [remainingTime, setRemainingTime] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [statusText, setStatusText] = useState('Connecting...');
  
  // Media State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const remainingTimeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const agoraInitializedRef = useRef(false);

  // 1. Initial Params Setup
  useEffect(() => {
    const type = (searchParams.get('type') as 'audio' | 'video') || 'audio';
    const name = searchParams.get('name') || 'Astrologer';
    const rate = parseFloat(searchParams.get('rate') || '0');
    
    setCallType(type);
    setAstrologerName(name);
    setCallRate(rate);
    setIsVideoOn(type === 'video');
  }, [searchParams]);

  // 2. Local Timer Logic
  const startLocalTimer = (durationSeconds: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    remainingTimeRef.current = durationSeconds;
    setRemainingTime(durationSeconds);

    timerIntervalRef.current = setInterval(() => {
      if (remainingTimeRef.current <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        handleHangup('timer_ended');
        return;
      }
      remainingTimeRef.current -= 1;
      setRemainingTime(remainingTimeRef.current);
    }, 1000);
  };

  // 3. Main Logic Flow
  useEffect(() => {
    if (!sessionId || !user?._id) return;

    let mounted = true;

    const initCallSession = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return openLoginModal();

        await callService.connectSocket(token);
        console.log('🔗 [Web] User joining session:', sessionId);
        callService.joinSession(sessionId, user._id, 'user');
        if (mounted) setStatusText('Waiting for Astrologer...');

        callService.on('timer_start', async (payload: any) => {
          if (!mounted || payload.sessionId !== sessionId) return;
          
          console.log('✅ [Web] timer_start:', payload);
          setStatusText('Call in Progress');
          
          const agoraUid = Number(payload.agoraUid) || Number(payload.agoraUserUid);
          if (isNaN(agoraUid)) {
            console.error('❌ [Web] Invalid UID:', payload.agoraUid);
            return;
          }
          
          startLocalTimer(payload.maxDurationSeconds || 300);
          setIsCallActive(true);
          
          await setupAgora({ ...payload, agoraUid });
        });

        callService.on('timer_tick', (payload: any) => {
          if (payload.sessionId === sessionId) {
             const diff = Math.abs(remainingTimeRef.current - payload.remainingSeconds);
             if (diff > 2) {
                 remainingTimeRef.current = payload.remainingSeconds;
                 setRemainingTime(payload.remainingSeconds);
             }
          }
        });

        const handleEndCall = (data: any) => {
          if (data?.sessionId === sessionId) {
            console.log('🛑 [Web] Call ended by server:', data);
            if (mounted) setStatusText('Call Ended');
            cleanupAndExit();
          }
        };
        callService.on('end-call', handleEndCall);
        callService.on('call_ended', handleEndCall);

        console.log('🔄 [Web] Syncing session state...');
        const syncData = await callService.syncSession(sessionId);
        
        if (mounted && syncData?.success && syncData.data?.remainingSeconds > 0) {
          console.log('🔄 [Web] Session active, syncing timer:', syncData.data.remainingSeconds);
          startLocalTimer(syncData.data.remainingSeconds);
          setIsCallActive(true);
          setStatusText('Call in Progress');
          
          if (syncData.data.agoraToken) {
             const uid = Number(syncData.data.agoraUid) || Number(syncData.data.agoraUserUid);
             if (!isNaN(uid)) {
                 await setupAgora({ ...syncData.data, agoraUid: uid });
             }
          }
        }

      } catch (error) {
        console.error('Call Init Error:', error);
        if (mounted) setStatusText('Connection Failed');
      }
    };

    initCallSession();

    return () => {
      mounted = false;
      agoraInitializedRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      
      callService.off('timer_start');
      callService.off('timer_tick');
      callService.off('end-call');
      callService.off('call_ended');
      
      callService.destroy().catch(err => console.warn('Cleanup error:', err));
    };
  }, [sessionId, user?._id, router]);

  // 4. Agora Setup Helper
  const setupAgora = async (payload: any) => {
    if (agoraInitializedRef.current) {
        console.log('⚠️ [Web] Agora already initialized, skipping duplicate setup.');
        return;
    }

    try {
      console.log('🎥 [Web] Starting Agora...');
      agoraInitializedRef.current = true;
      
      callService.onUserPublished = async (remoteUser: any, mediaType: 'audio' | 'video') => {
        console.log('🎤 [Web] Remote published:', remoteUser.uid, mediaType);
        
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play();
        }
        if (mediaType === 'video' && remoteVideoRef.current) {
          setTimeout(() => {
             if (remoteVideoRef.current) remoteUser.videoTrack?.play(remoteVideoRef.current);
          }, 100);
          setRemoteUserJoined(true);
        }
      };

      callService.onUserLeft = () => {
        setRemoteUserJoined(false);
        setStatusText('Astrologer Disconnected');
      };

      await callService.joinChannel(
        payload.agoraToken,
        payload.agoraChannelName || payload.channelName,
        payload.agoraUid,
        callType === 'video',
        payload.agoraAppId
      );

      if (callType === 'video' && localVideoRef.current) {
        callService.playLocalVideo(localVideoRef.current);
      }
      
      console.log('🎉 [Web] Agora connected!');
      
    } catch (error: any) {
      if (error?.code === 'INVALID_OPERATION' || error?.message?.includes('connecting/connected')) {
          console.warn('⚠️ [Web] Agora join race condition detected (harmless).');
          return;
      }

      console.error('❌ [Web] Agora failed:', error);
      setStatusText('Media Connection Failed');
      agoraInitializedRef.current = false;
    }
  };

  const cleanupAndExit = async () => {
    console.log('🧹 [Web] Cleaning up...');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    try {
        await callService.destroy();
    } catch (e) {
        console.warn('Error during destroy:', e);
    }
    
    router.replace('/orders');
  };

  const handleHangup = async (reason = 'ended_by_user') => {
    if (!user?._id) return;
    setStatusText('Ending Call...');
    
    try {
        await callService.endCall(sessionId, user._id, reason);
    } catch (error) {
        console.error('Error sending end call signal:', error);
    }
    
    await cleanupAndExit();
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    callService.toggleMic(newState);
  };

  const toggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    callService.toggleVideo(newState);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RENDER: AUDIO CALL INTERFACE ---
  if (callType === 'audio') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-linear-to-br from-blue-950 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        {/* Avatar with Pulse Effect */}
        <div className="relative mb-10 z-10">
          <div className="absolute inset-0 bg-yellow-400 rounded-full opacity-30 animate-ping"></div>
          <div className="absolute inset-0 bg-linear-to-br from-yellow-400 to-yellow-600 rounded-full opacity-20 animate-pulse"></div>
          <div className="w-36 h-36 bg-linear-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center text-5xl font-bold relative z-10 shadow-2xl shadow-yellow-500/30 ring-4 ring-blue-400/30">
            {astrologerName.charAt(0)}
          </div>
        </div>

        {/* Astrologer Name */}
        <h2 className="text-4xl font-bold mb-3 z-10 bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent">
          {astrologerName}
        </h2>

        {/* Status Text */}
        <div className="flex items-center gap-2 mb-10 z-10">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50"></div>
          <p className="text-blue-200 text-lg animate-pulse">{statusText}</p>
        </div>

        {/* Timer Display */}
        <div className="text-8xl font-light mb-6 font-mono z-10 tracking-wider bg-linear-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-lg">
          {formatTime(remainingTime)}
        </div>

        {/* Rate Badge - Glassmorphism */}
        <div className="bg-white/10 backdrop-blur-md px-8 py-3 rounded-full text-base mb-16 z-10 border border-white/20 shadow-xl">
          <span className="text-blue-100">Rate: </span>
          <span className="text-yellow-400 font-bold">₹{callRate}/min</span>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-6 z-10">
          {/* Mic Toggle */}
          <button 
            onClick={toggleMic} 
            className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg ${
              isMicOn 
                ? 'bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border-2 border-white/30 hover:border-yellow-400/50' 
                : 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 shadow-red-500/50'
            }`}
            aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? (
              <Mic className="w-6 h-6" strokeWidth={2.5} />
            ) : (
              <MicOff className="w-6 h-6" strokeWidth={2.5} />
            )}
            {/* Tooltip */}
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {isMicOn ? 'Mute' : 'Unmute'}
            </span>
          </button>

          {/* Hangup Button */}
          <button 
            onClick={() => handleHangup('user_ended')} 
            className="group relative w-20 h-20 rounded-full bg-linear-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-2xl shadow-red-600/50 transform hover:scale-110 active:scale-95 transition-all duration-300 hover:from-red-600 hover:to-red-800 ring-4 ring-red-500/30 hover:ring-red-400/50"
            aria-label="End call"
          >
            <PhoneOff className="w-8 h-8" strokeWidth={2.5} />
            {/* Tooltip */}
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              End Call
            </span>
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: VIDEO CALL INTERFACE ---
  return (
    <div className="relative w-full h-screen bg-linear-to-br from-slate-900 to-blue-950 overflow-hidden">
      {/* Remote Video Container */}
      <div className="absolute inset-0 w-full h-full bg-linear-to-br from-blue-950 to-slate-900">
        <div ref={remoteVideoRef} className="w-full h-full" />
        
        {/* Loading State */}
        {!remoteUserJoined && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-blue-900/30 backdrop-blur-md px-10 py-8 rounded-2xl border border-blue-400/30 shadow-2xl">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
              <p className="text-blue-100 text-lg">Waiting for video stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute top-6 right-6 w-36 h-52 bg-linear-to-br from-blue-900 to-slate-800 rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-2xl shadow-blue-900/50 z-20 ring-2 ring-blue-400/20">
        <div ref={localVideoRef} className="w-full h-full object-cover"></div>
        {!isVideoOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900/90 backdrop-blur-sm">
            <VideoOff className="w-12 h-12 text-white" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Top Bar - Timer & Rate */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-linear-to-b from-black/60 via-black/30 to-transparent backdrop-blur-sm">
        <div className="flex justify-between items-center text-white">
          {/* Timer Display */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
            <span className="font-mono text-2xl font-semibold tracking-wide text-yellow-300">
              {formatTime(remainingTime)}
            </span>
          </div>

          {/* Rate Badge */}
          <div className="bg-linear-to-r from-yellow-400 to-yellow-500 text-blue-950 px-6 py-2.5 rounded-full text-base font-bold shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-300/50">
            ₹{callRate}/min
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-12 left-0 right-0 z-20 flex justify-center gap-6">
        {/* Mic Toggle */}
        <button 
          onClick={toggleMic} 
          className={`group relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            isMicOn 
              ? 'bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-yellow-400/50' 
              : 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 shadow-red-500/50'
          }`}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? (
            <Mic className="w-6 h-6" strokeWidth={2.5} />
          ) : (
            <MicOff className="w-6 h-6" strokeWidth={2.5} />
          )}
          {/* Tooltip */}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isMicOn ? 'Mute' : 'Unmute'}
          </span>
        </button>

        {/* Video Toggle */}
        <button 
          onClick={toggleVideo} 
          className={`group relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            isVideoOn 
              ? 'bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-yellow-400/50' 
              : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-400 shadow-blue-500/50'
          }`}
          aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? (
            <Video className="w-6 h-6" strokeWidth={2.5} />
          ) : (
            <VideoOff className="w-6 h-6" strokeWidth={2.5} />
          )}
          {/* Tooltip */}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isVideoOn ? 'Stop Video' : 'Start Video'}
          </span>
        </button>

        {/* Hangup Button */}
        <button 
          onClick={() => handleHangup('ended_by_user')} 
          className="group relative w-20 h-20 rounded-full bg-linear-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-2xl shadow-red-600/60 transform hover:scale-110 active:scale-95 transition-all duration-300 hover:from-red-600 hover:to-red-800 ring-4 ring-red-500/40 hover:ring-red-400/50"
          aria-label="End call"
        >
          <PhoneOff className="w-8 h-8" strokeWidth={2.5} />
          {/* Tooltip */}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            End Call
          </span>
        </button>
      </div>
    </div>
  );
}
