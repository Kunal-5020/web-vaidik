'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import callService from '@/lib/callService';

export default function CallScreen() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
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
        clearInterval(timerIntervalRef.current!);
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
        if (!token) return router.push('/login');

        // A. Connect Socket (Wait for it!)
        await callService.connectSocket(token);

        // B. Join Session Room
        console.log('🔗 [Web] User joining session:', sessionId);
        callService.joinSession(sessionId, user._id, 'user');
        setStatusText('Waiting for Astrologer...');

        // C. Setup Socket Listeners
        callService.on('timer_start', async (payload: any) => {
          if (payload.sessionId !== sessionId) return;
          
          console.log('✅ [Web] timer_start:', payload);
          setStatusText('Call in Progress');
          
          const agoraUid = Number(payload.agoraUid) || Number(payload.agoraUserUid);
          if (isNaN(agoraUid)) {
            console.error('❌ [Web] Invalid UID:', payload.agoraUid);
            return;
          }
          
          // Start Timer
          startLocalTimer(payload.maxDurationSeconds || 300);
          setIsCallActive(true);
          
          // Initialize Agora
          await setupAgora({ ...payload, agoraUid });
        });

        // Drift Correction
        callService.on('timer_tick', (payload: any) => {
          if (payload.sessionId === sessionId) {
             const diff = Math.abs(remainingTimeRef.current - payload.remainingSeconds);
             if (diff > 2) {
                 remainingTimeRef.current = payload.remainingSeconds;
                 setRemainingTime(payload.remainingSeconds);
             }
          }
        });

        // Handle End Call
        const handleEndCall = (data: any) => {
          if (data?.sessionId === sessionId) {
            console.log('🛑 [Web] Call ended:', data);
            setStatusText('Call Ended');
            if (mounted) cleanupAndExit();
          }
        };
        callService.on('end-call', handleEndCall);
        callService.on('call_ended', handleEndCall);

        // D. Manual Sync (Page Refresh Recovery)
        console.log('🔄 [Web] Syncing session state...');
        const syncData = await callService.syncSession(sessionId);
        
        if (syncData?.success && syncData.data?.remainingSeconds > 0) {
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
        setStatusText('Connection Failed');
      }
    };

    initCallSession();

    return () => {
      mounted = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      callService.off('timer_start');
      callService.off('timer_tick');
      callService.off('end-call');
      callService.off('call_ended');
      callService.destroy();
    };
  }, [sessionId, user?._id, router]);

  // 4. Agora Setup Helper
  const setupAgora = async (payload: any) => {
    try {
      console.log('🎥 [Web] Starting Agora...');
      
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
      
    } catch (error) {
      console.error('❌ [Web] Agora failed:', error);
      setStatusText('Media Connection Failed');
    }
  };

  const cleanupAndExit = async () => {
    console.log('🧹 [Web] Cleaning up...');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    await callService.destroy();
    router.replace('/orders');
  };

  const handleHangup = async (reason = 'ended_by_user') => {
    if (!user?._id) return;
    setStatusText('Ending Call...');
    await callService.endCall(sessionId, user._id, reason);
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

  // --- RENDER --- (Same as provided previously)
  if (callType === 'audio') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-gray-900 to-black pointer-events-none"></div>
        <div className="relative mb-12 z-10">
          <div className="absolute inset-0 bg-yellow-500 rounded-full opacity-20 animate-ping"></div>
          <div className="w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-gray-800 relative z-10 shadow-2xl">
            {astrologerName.charAt(0)}
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-2 z-10">{astrologerName}</h2>
        <p className="text-gray-400 mb-8 z-10 animate-pulse">{statusText}</p>
        <div className="text-7xl font-thin mb-4 font-mono z-10 tracking-widest">{formatTime(remainingTime)}</div>
        <div className="bg-gray-800/80 backdrop-blur px-6 py-2 rounded-full text-sm text-gray-300 mb-12 z-10 border border-gray-700">Rate: ₹{callRate}/min</div>
        <div className="flex gap-8 z-10">
          <button onClick={toggleMic} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${isMicOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white text-black'}`}>
            <span className="font-bold text-xl">{isMicOn ? '🎤' : '🔇'}</span>
          </button>
          <button onClick={() => handleHangup('user_ended')} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transform hover:scale-105 transition-all hover:bg-red-700">
            <span className="font-bold text-xl">📞</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gray-900">
        <div ref={remoteVideoRef} className="w-full h-full" />
        {!remoteUserJoined && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p>Waiting for video stream...</p>
            </div>
          </div>
        )}
      </div>
      <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl z-20">
        <div ref={localVideoRef} className="w-full h-full object-cover"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-linear-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
            <span className="font-mono text-xl font-medium tracking-wide">{formatTime(remainingTime)}</span>
          </div>
          <div className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">₹{callRate}/min</div>
        </div>
      </div>
      <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-8">
        <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 ${isMicOn ? 'bg-gray-700/80 text-white hover:bg-gray-600' : 'bg-white text-black'}`}>🎤</button>
        <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 ${isVideoOn ? 'bg-gray-700/80 text-white hover:bg-gray-600' : 'bg-white text-black'}`}>📹</button>
        <button onClick={() => handleHangup('ended_by_user')} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/40 transform hover:scale-110 transition-all hover:bg-red-700">📞</button>
      </div>
    </div>
  );
}