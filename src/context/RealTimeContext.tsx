'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import chatService from '../lib/chatService';
import callService from '../lib/callService';
import orderService from '../lib/orderService';
import notificationService from '../lib/notificationService';
import { onForegroundMessage } from '../lib/firebase';

// ... [Interfaces remain the same] ...
interface Astrologer {
  _id: string;
  id?: string;
  name: string;
  profileImage?: string;
  profilePicture?: string;
  image?: string;
  pricing?: {
    chat?: number;
    call?: number;
    video?: number;
  };
  price?: number;
  chatRate?: number;
  callRate?: number;
  callPrice?: number;
  currentRate?: number;
}

interface ChatSession {
  sessionId: string;
  orderId: string;
  status: string;
  ratePerMinute: number;
  expectedWaitTime?: number;
  queuePosition?: number;
  astrologer: {
    id: string;
    _id: string;
    name: string;
    image?: string;
    price: number;
  };
}

interface CallSession {
  sessionId: string;
  orderId: string;
  status: string;
  callType: 'audio' | 'video';
  ratePerMinute: number;
  expectedWaitTime?: number;
  queuePosition?: number;
  astrologer: {
    id: string;
    _id: string;
    name: string;
    image?: string;
    callPrice: number;
  };
}

interface IncomingCall {
  sessionId: string;
  orderId: string;
  callType: 'audio' | 'video';
  ratePerMinute: number;
  caller: {
    id: string;
    name: string;
  };
}

interface RealTimeContextType {
  ready: boolean;
  // Chat
  pendingChatSession: ChatSession | null;
  chatWaitingVisible: boolean;
  isChatProcessing: boolean;
  initiateChat: (astrologer: Astrologer) => Promise<{ success: boolean; message?: string; data?: any }>;
  cancelChat: () => void;
  // Call
  pendingCallSession: CallSession | null;
  callWaitingVisible: boolean;
  isCallProcessing: boolean;
  initiateCall: (astrologer: Astrologer, callType?: 'audio' | 'video') => Promise<{ success: boolean; message?: string; data?: any }>;
  cancelCall: () => void;
  // Incoming call
  incomingCall: IncomingCall | null;
  incomingCallVisible: boolean;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
}

const RealTimeContext = createContext<RealTimeContextType | null>(null);

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [socketInitialized, setSocketInitialized] = useState(false);
  
  // Chat State
  const [pendingChatSession, setPendingChatSession] = useState<ChatSession | null>(null);
  const [chatWaitingVisible, setChatWaitingVisible] = useState(false);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  
  // Call State
  const [pendingCallSession, setPendingCallSession] = useState<CallSession | null>(null);
  const [callWaitingVisible, setCallWaitingVisible] = useState(false);
  const [isCallProcessing, setIsCallProcessing] = useState(false);
  
  // Incoming Call State
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingCallVisible, setIncomingCallVisible] = useState(false);

  // Use refs to access latest state in event handlers
  const pendingChatRef = useRef<ChatSession | null>(null);
  const pendingCallRef = useRef<CallSession | null>(null);

  useEffect(() => { pendingChatRef.current = pendingChatSession; }, [pendingChatSession]);
  useEffect(() => { pendingCallRef.current = pendingCallSession; }, [pendingCallSession]);

  // Register Firebase service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => console.log('✅ SW registered:', registration.scope))
        .catch((err) => console.error('❌ SW failed:', err));
    }
  }, []);

  // Handle foreground FCM messages
  useEffect(() => {
    if (!isAuthenticated) return;

    onForegroundMessage((payload) => {
      console.log('📨 [FCM Foreground] Message received:', payload);
      const data = payload.data || {};
      const notification = payload.notification || {};

      // Handle request_accepted for chat
      if ((data.type === 'request_accepted' && data.mode === 'chat') || data.step === 'astrologer_accepted_chat') {
        const currentPending = pendingChatRef.current;
        if (currentPending && (data.sessionId === currentPending.sessionId || data.orderId === currentPending.orderId)) {
          console.log('🎉 [FCM] Chat accepted! Navigating...');
          setChatWaitingVisible(false);
          setPendingChatSession(null);
          router.push(`/chat/${currentPending.orderId}`);
          return;
        }
      }

      // Handle request_accepted for call
      if ((data.type === 'request_accepted' && data.mode === 'call') || data.type === 'call_accepted' || data.step === 'astrologer_accepted') {
        const currentPending = pendingCallRef.current;
        if (currentPending) {
          console.log('🎉 [FCM] Call accepted! Navigating...');
          setCallWaitingVisible(false);
          setPendingCallSession(null);
          router.push(`/call/${currentPending.sessionId}?type=${currentPending.callType}&name=${currentPending.astrologer.name}&rate=${currentPending.ratePerMinute}`);
          return;
        }
      }

      // Handle call ended
      if (data.type === 'call_ended' && data.mode === 'call') {
        const currentPending = pendingCallRef.current;
        if (currentPending && data.sessionId === currentPending.sessionId) {
          setCallWaitingVisible(false);
          setPendingCallSession(null);
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/call/')) {
            window.location.href = '/orders';
          }
          return;
        }
      }

      // Dispatch event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification-received', {
            detail: { type: data.type || data.step, title: notification.title, message: notification.body, data }
        }));
      }
    });
  }, [isAuthenticated, router]);

  // ✅ Setup Sockets (Chat, Call, Notifications)
  useEffect(() => {
    let setupAttempted = false;

    const setupSockets = async () => {
      if (setupAttempted) return;
      setupAttempted = true;

      const userId = user?._id; 
      if (!isAuthenticated || !userId) return;

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // 1. Notification Socket
        await notificationService.connect(token);
        notificationService.on('notification', (notification: any) => {
            // ... (keep existing notification logic)
            if (notification.type === 'request_accepted' && notification.data?.mode === 'chat') {
                const currentPending = pendingChatRef.current;
                if (currentPending && notification.data.sessionId === currentPending.sessionId) {
                  setChatWaitingVisible(false);
                  setPendingChatSession(null);
                  router.push(`/chat/${currentPending.orderId}`);
                }
            }
            if (notification.type === 'request_accepted' && notification.data?.mode === 'call') {
                const currentPending = pendingCallRef.current;
                if (currentPending && notification.data.sessionId === currentPending.sessionId) {
                  setCallWaitingVisible(false);
                  setPendingCallSession(null);
                  router.push(`/call/${currentPending.sessionId}?type=${currentPending.callType}&name=${currentPending.astrologer.name}&rate=${currentPending.ratePerMinute}`);
                }
            }
        });

        // 2. Chat Socket
        await chatService.connect(token);
        chatService.on('chat_accepted', (payload: any) => {
          const currentPending = pendingChatRef.current;
          if (!currentPending) return;
          const incomingId = payload.sessionId || payload.data?.sessionId;
          if (incomingId && incomingId !== currentPending.sessionId) return;
          setChatWaitingVisible(false);
          setPendingChatSession(null);
          router.push(`/chat/${currentPending.orderId}`);
        });
        chatService.on('chat_rejected', (payload: any) => {
          setChatWaitingVisible(false);
          setPendingChatSession(null);
          alert(payload.message || 'Astrologer rejected your chat request.');
        });

        // 3. Call Socket
        await callService.connectSocket(token);
        
        callService.on('call_accepted', (payload: any) => {
          const currentPending = pendingCallRef.current;
          if (!currentPending) return;
          const incomingId = payload.sessionId || payload.data?.sessionId || payload.id;
          // Soft check on ID to allow navigation
          setCallWaitingVisible(false);
          setPendingCallSession(null);
          router.push(`/call/${currentPending.sessionId}?type=${currentPending.callType}&name=${currentPending.astrologer.name}&rate=${currentPending.ratePerMinute}`);
        });

        callService.on('call_rejected', (payload: any) => {
          setCallWaitingVisible(false);
          setPendingCallSession(null);
          alert(payload.message || 'Astrologer rejected your call request.');
        });

        callService.on('call_cancelled', () => {
           setCallWaitingVisible(false);
           setPendingCallSession(null);
        });

        callService.on('call_timeout', () => {
          setCallWaitingVisible(false);
          setPendingCallSession(null);
          alert('Astrologer did not respond. No amount has been charged to your wallet.');
        });

        callService.on('incoming_call', (payload: any) => {
          setIncomingCall({
            sessionId: payload.sessionId,
            orderId: payload.orderId,
            callType: payload.callType,
            ratePerMinute: payload.ratePerMinute,
            caller: { id: payload.userId, name: payload.userName || 'User' },
          });
          setIncomingCallVisible(true);
        });

        setSocketInitialized(true);
      } catch (error) {
        console.error('❌ [RealTime] Socket setup failed:', error);
        setSocketInitialized(false);
      }
    };

    setupSockets();

    return () => {
      notificationService.disconnect();
      chatService.disconnect();
      callService.destroy(); 
    };
  }, [isAuthenticated, user, router]);


  // ✅ Initiate Chat (Fixed Balance + Socket)
  const initiateChat = useCallback(async (astrologer: Astrologer) => {
    if (isChatProcessing) return { success: false, message: 'Already processing' };

    try {
      setIsChatProcessing(true);
      const chatRate = astrologer.pricing?.chat ?? astrologer.chatRate ?? astrologer.currentRate ?? 10;
      const balanceCheck = await orderService.checkBalance(chatRate, 5);

      // FIX 1: Redirect on Low Balance
      if (!balanceCheck.success) {
        router.push('/wallet/recharge');
        return { success: false, message: 'Insufficient balance' };
      }

      const chatResponse = await chatService.initiateChat({
        astrologerId: astrologer._id || astrologer.id!,
        astrologerName: astrologer.name,
        ratePerMinute: chatRate,
      });

      if (chatResponse.success && chatResponse.data?.sessionId) {
        const data = chatResponse.data;
        const newChatSession: ChatSession = {
          sessionId: data.sessionId,
          orderId: data.orderId,
          status: data.status,
          ratePerMinute: chatRate,
          expectedWaitTime: data.expectedWaitTime || null,
          queuePosition: data.queuePosition || null,
          astrologer: {
            id: astrologer.id || astrologer._id,
            _id: astrologer._id || astrologer.id!,
            name: astrologer.name,
            image: astrologer.image || astrologer.profileImage || astrologer.profilePicture,
            price: chatRate,
          },
        };

        setPendingChatSession(newChatSession);
        setChatWaitingVisible(true);
        
        // FIX 2: Ensure Socket is Connected before Joining
        if (user?._id) {
            const token = localStorage.getItem('accessToken');
            if (token) {
                // Force check connection to avoid "Socket not connected" error
                await chatService.connect(token);
                chatService.joinSession(data.sessionId, user._id);
            }
        }

        return { success: true, data };
      } else {
        const errorMsg = chatResponse.message || 'Unable to start chat session';
        alert(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (error: any) {
      console.error('❌ Chat initiate error:', error);
      return { success: false, message: error.message };
    } finally {
      setIsChatProcessing(false);
    }
  }, [isChatProcessing, router, user]);


  // ✅ Initiate Call (Fixed Balance + Socket)
  const initiateCall = useCallback(async (astrologer: Astrologer, callType: 'audio' | 'video' = 'audio') => {
    if (isCallProcessing) return { success: false, message: 'Already processing' };

    try {
      setIsCallProcessing(true);
      const callRate = astrologer.pricing?.call ?? astrologer.callRate ?? astrologer.callPrice ?? 15;
      const balanceCheck = await orderService.checkBalance(callRate, 5);

      // FIX 1: Redirect on Low Balance
      if (!balanceCheck.success) {
         router.push('/wallet/recharge');
         return { success: false, message: 'Insufficient balance' };
      }

      const callResponse = await callService.initiateCall({
        astrologerId: astrologer._id || astrologer.id!,
        astrologerName: astrologer.name,
        callType,
        ratePerMinute: callRate,
      });

      if (callResponse.success && callResponse.data?.sessionId) {
        const data = callResponse.data;

        const newCallSession: CallSession = {
          sessionId: data.sessionId,
          orderId: data.orderId,
          status: data.status,
          callType,
          ratePerMinute: callRate,
          expectedWaitTime: data.expectedWaitTime || null,
          queuePosition: data.queuePosition || null,
          astrologer: {
            id: astrologer.id || astrologer._id,
            _id: astrologer._id || astrologer.id!,
            name: astrologer.name,
            image: astrologer.image || astrologer.profileImage || astrologer.profilePicture,
            callPrice: callRate,
          },
        };

        setPendingCallSession(newCallSession);
        setCallWaitingVisible(true);

        // FIX 2: FORCE SOCKET CONNECTION & RETRY LOGIC
        if (user?._id) {
            console.log(`🔌 [RealTime] Attempting to join session: ${data.sessionId}`);
            try {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    // Critical: Await the connection to ensure it's ready before emitting
                    await callService.connectSocket(token);
                    
                    // Small delay to ensure socket state is propagated if necessary
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    callService.joinSession(data.sessionId, user._id, 'user');
                    console.log('✅ [RealTime] Successfully joined session room');
                }
            } catch (socketErr) {
                console.error("❌ [RealTime] Critical Socket Error - Could not join session room:", socketErr);
                // Even if this fails, we don't return false, because FCM might still save us.
            }
        }

        return { success: true, data };
      } else {
        const errorMsg = callResponse.message || 'Unable to start call session';
        alert(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (error: any) {
      console.error('❌ Call initiate error:', error);
      return { success: false, message: error.message };
    } finally {
      setIsCallProcessing(false);
    }
  }, [isCallProcessing, router, user]);

  const cancelChat = useCallback(() => {
    setChatWaitingVisible(false);
    setPendingChatSession(null);
  }, []);

  const cancelCall = useCallback(async () => {
    if (pendingCallRef.current) {
        try {
            await callService.cancelCall(pendingCallRef.current.sessionId, 'user_cancelled');
        } catch (e) {
            console.error('Failed to send cancel to backend', e);
        }
    }
    setCallWaitingVisible(false);
    setPendingCallSession(null);
  }, []);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    setIncomingCallVisible(false);
    router.push(`/call/${incomingCall.sessionId}?type=${incomingCall.callType}&isIncoming=true`);
    setIncomingCall(null);
  }, [incomingCall, router]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    const userId = user?._id || '';
    callService.endCall(incomingCall.sessionId, userId, 'rejected_by_user');
    setIncomingCallVisible(false);
    setIncomingCall(null);
  }, [incomingCall, user]);

  const value: RealTimeContextType = {
    ready: true,
    pendingChatSession, chatWaitingVisible, isChatProcessing, initiateChat, cancelChat,
    pendingCallSession, callWaitingVisible, isCallProcessing, initiateCall, cancelCall,
    incomingCall, incomingCallVisible, acceptIncomingCall, rejectIncomingCall,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const ctx = useContext(RealTimeContext);
  if (!ctx) throw new Error('useRealTime must be used within RealTimeProvider');
  return ctx;
};