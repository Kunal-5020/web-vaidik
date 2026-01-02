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
    setIsCallActive(true);
    setStatusText('Call in Progress');

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

        // ✅ 1. LISTEN FOR CREDENTIALS
        callService.on('call_credentials', async (payload: any) => {
             console.log('🔑 [Web] Received credentials:', payload);
             if (payload.sessionId !== sessionId) return;

             // Init Agora
             const uid = Number(payload.agoraUid) || Number(payload.agoraUserUid);
             await setupAgora({ ...payload, agoraUid: uid });

             // ✅ 2. EMIT JOINED EVENT (Signal backend we are ready)
             callService.notifyAgoraJoined(sessionId, 'user');
        });

        // ✅ 3. LISTEN FOR TIMER START
        callService.on('timer_start', async (payload: any) => {
          if (!mounted || payload.sessionId !== sessionId) return;
          console.log('✅ [Web] timer_start:', payload);
          startLocalTimer(payload.maxDurationSeconds || 300);
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

        // Sync for reconnects
        console.log('🔄 [Web] Syncing session state...');
        const syncData = await callService.syncSession(sessionId);
        if (mounted && syncData?.success && syncData.data?.remainingSeconds > 0) {
           startLocalTimer(syncData.data.remainingSeconds);
           // If we are late joining an active call, credentials might need to be fetched 
           // or processed if included in syncData
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
      
      callService.off('call_credentials'); // Clear new listener
      callService.off('timer_start');
      callService.off('timer_tick');
      callService.off('end-call');
      callService.off('call_ended');
      
      callService.destroy().catch(err => console.warn('Cleanup error:', err));
    };
  }, [sessionId, user?._id, router]);

  // 4. Agora Setup Helper
  const setupAgora = async (payload: any) => {
    if (agoraInitializedRef.current) return;

    try {
      console.log('🎥 [Web] Starting Agora...');
      agoraInitializedRef.current = true;
      
      callService.onUserPublished = async (remoteUser: any, mediaType: 'audio' | 'video') => {
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
      console.error('❌ [Web] Agora failed:', error);
      setStatusText('Media Connection Failed');
      agoraInitializedRef.current = false;
    }
  };

  const cleanupAndExit = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    try { await callService.destroy(); } catch (e) {}
    router.replace('/orders');
  };

  const handleHangup = async (reason = 'ended_by_user') => {
    if (!user?._id) return;
    setStatusText('Ending Call...');
    try { await callService.endCall(sessionId, user._id, reason); } catch (error) {}
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

        <h2 className="text-4xl font-bold mb-3 z-10 bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent">{astrologerName}</h2>

        <div className="flex items-center gap-2 mb-10 z-10">
          <div className={`w-2 h-2 rounded-full shadow-lg ${isCallActive ? 'bg-green-500 shadow-green-400/50' : 'bg-yellow-400 animate-pulse shadow-yellow-400/50'}`}></div>
          <p className="text-blue-200 text-lg">{statusText}</p>
        </div>

        {isCallActive && (
             <div className="text-8xl font-light mb-6 font-mono z-10 tracking-wider bg-linear-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-lg">
               {formatTime(remainingTime)}
             </div>
        )}

        <div className="bg-white/10 backdrop-blur-md px-8 py-3 rounded-full text-base mb-16 z-10 border border-white/20 shadow-xl">
          <span className="text-blue-100">Rate: </span>
          <span className="text-yellow-400 font-bold">₹{callRate}/min</span>
        </div>

        <div className="flex gap-6 z-10">
          <button 
            onClick={toggleMic} 
            className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg ${isMicOn ? 'bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border-2 border-white/30 hover:border-yellow-400/50' : 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 shadow-red-500/50'}`}
          >
            {isMicOn ? <Mic className="w-6 h-6" strokeWidth={2.5} /> : <MicOff className="w-6 h-6" strokeWidth={2.5} />}
          </button>

          <button 
            onClick={() => handleHangup('user_ended')} 
            className="group relative w-20 h-20 rounded-full bg-linear-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-2xl shadow-red-600/50 transform hover:scale-110 active:scale-95 transition-all duration-300 hover:from-red-600 hover:to-red-800 ring-4 ring-red-500/30 hover:ring-red-400/50"
          >
            <PhoneOff className="w-8 h-8" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // Video Render... (Kept essentially same, just ensuring variables are used)
  return (
    <div className="relative w-full h-screen bg-linear-to-br from-slate-900 to-blue-950 overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-linear-to-br from-blue-950 to-slate-900">
        <div ref={remoteVideoRef} className="w-full h-full" />
        {!remoteUserJoined && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-blue-900/30 backdrop-blur-md px-10 py-8 rounded-2xl border border-blue-400/30 shadow-2xl">
              <p className="text-blue-100 text-lg">Waiting for video stream...</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-6 right-6 w-36 h-52 bg-linear-to-br from-blue-900 to-slate-800 rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-2xl shadow-blue-900/50 z-20 ring-2 ring-blue-400/20">
        <div ref={localVideoRef} className="w-full h-full object-cover"></div>
        {!isVideoOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900/90 backdrop-blur-sm">
            <VideoOff className="w-12 h-12 text-white" strokeWidth={2} />
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-linear-to-b from-black/60 via-black/30 to-transparent backdrop-blur-sm">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl">
            <div className={`w-2.5 h-2.5 rounded-full ${remainingTime < 60 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="font-mono text-2xl font-semibold tracking-wide text-yellow-300">{formatTime(remainingTime)}</span>
          </div>
          <div className="bg-linear-to-r from-yellow-400 to-yellow-500 text-blue-950 px-6 py-2.5 rounded-full text-base font-bold shadow-lg shadow-yellow-500/30">₹{callRate}/min</div>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 z-20 flex justify-center gap-6">
        <button onClick={toggleMic} className={`group w-16 h-16 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md ${isMicOn ? 'bg-white/20' : 'bg-red-500'}`}>
           {isMicOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
        </button>
        <button onClick={toggleVideo} className={`group w-16 h-16 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md ${isVideoOn ? 'bg-white/20' : 'bg-blue-600'}`}>
           {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
        </button>
        <button onClick={() => handleHangup('ended_by_user')} className="group w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl">
           <PhoneOff className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
}