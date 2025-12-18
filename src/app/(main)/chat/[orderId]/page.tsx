'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import chatService from '@/lib/chatService';
import { Play, Pause, Download } from 'lucide-react';

// --- Interfaces ---
interface Message {
  _id: string;
  messageId?: string;
  orderId: string;
  sessionId?: string;
  senderId: string;
  senderModel: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'voice_note' | 'kundli_details';
  status: 'sent' | 'delivered' | 'read';
  sentAt: string;
  isStarred?: boolean;
  kundliDetails?: any;
  fileUrl?: string;
  mediaUrl?: string;
  url?: string;
  thumbnailUrl?: string;
  fileDuration?: number;
  fileName?: string;
}

interface ActiveSession {
  sessionId: string;
  type: 'chat' | 'call';
  status: 'initiated' | 'waiting' | 'active' | 'ended' | 'pending' | 'created';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

// --- Audio Player Component ---
const AudioPlayer = ({ url, duration }: { url: string; duration?: number }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setTotalDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-purple-600" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 text-purple-600 ml-0.5" fill="currentColor" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-600">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
};

// --- Video Player Component ---
const VideoPlayer = ({ url, thumbnail }: { url: string; thumbnail?: string }) => {
  const [showVideo, setShowVideo] = useState(false);

  if (!showVideo) {
    return (
      <div
        className="relative cursor-pointer group rounded-lg overflow-hidden"
        onClick={() => setShowVideo(true)}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full max-w-[300px] h-auto object-cover"
          />
        ) : (
          <div className="w-full max-w-[300px] h-[200px] bg-gray-900 flex items-center justify-center">
            <Play className="w-16 h-16 text-white opacity-70" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      controls
      autoPlay
      className="w-full max-w-[300px] rounded-lg"
      src={url}
    >
      Your browser does not support video playback.
    </video>
  );
};

// --- Image Viewer Component ---
const ImageViewer = ({ url }: { url: string }) => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <img
        src={url}
        alt="Shared image"
        className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setFullscreen(true)}
      />
      
      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={url}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            onClick={() => setFullscreen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

// --- Kundli Details Card ---
const KundliCard = ({ details, content }: { details?: any; content?: string }) => {
  // Parse from content if details not provided
  let kundliInfo = details;
  
  if (!kundliInfo && content) {
    const lines = content.split('\n');
    kundliInfo = {};
    lines.forEach(line => {
      if (line.includes('Name:')) kundliInfo.name = line.split('Name:')[1]?.trim();
      if (line.includes('DOB:')) kundliInfo.dob = line.split('DOB:')[1]?.trim();
      if (line.includes('Time:')) kundliInfo.birthTime = line.split('Time:')[1]?.trim();
      if (line.includes('Place:')) kundliInfo.birthPlace = line.split('Place:')[1]?.trim();
      if (line.includes('Gender:')) kundliInfo.gender = line.split('Gender:')[1]?.trim();
    });
  }

  if (!kundliInfo || Object.keys(kundliInfo).length === 0) return null;

  return (
    <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-3 max-w-[300px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📜</span>
        <span className="font-semibold text-purple-900 text-sm">Kundli Details</span>
      </div>
      <div className="space-y-1 text-xs text-gray-700">
        {kundliInfo.name && <div><strong>Name:</strong> {kundliInfo.name}</div>}
        {kundliInfo.gender && <div><strong>Gender:</strong> {kundliInfo.gender}</div>}
        {kundliInfo.dob && <div><strong>DOB:</strong> {kundliInfo.dob}</div>}
        {kundliInfo.birthTime && <div><strong>Birth Time:</strong> {kundliInfo.birthTime}</div>}
        {kundliInfo.birthPlace && <div><strong>Birth Place:</strong> {kundliInfo.birthPlace}</div>}
      </div>
    </div>
  );
};

export default function ChatScreen() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.orderId as string;

  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  const [astrologerInfo, setAstrologerInfo] = useState<any>(null);
  const [imgError, setImgError] = useState(false);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isActiveMode, setIsActiveMode] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStatus, setSessionStatus] = useState('initiated');
  const [showContinueModal, setShowContinueModal] = useState(false);
  
  const [kundliData, setKundliData] = useState<any>(null);

  // --- Refs ---
  const activeSessionRef = useRef<ActiveSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const detailsSentRef = useRef(false);
  const listenersAttached = useRef(false);

  // Sync ref
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping, isActiveMode]);

  // --- 1. Initialization ---
  useEffect(() => {
    if (!user?._id || !orderId) return;

    let mounted = true;

    const initChat = async () => {
      try {
        setLoading(true);
        const summary = await chatService.getConversationSummary(orderId);
        
        if (!mounted) return;

        if (summary.success && summary.data) {
          if (summary.data.astrologer) setAstrologerInfo(summary.data.astrologer);
          if (summary.data.kundliDetails) setKundliData(summary.data.kundliDetails);
          
          // Load Messages
          const msgRes = await chatService.getConversationMessages(orderId);
          if (msgRes.success) {
             setMessages(msgRes.data.messages || []);
          }

          // Determine Session Status
          const currentId = summary.data.currentSessionId;
          const hist = summary.data.sessionHistory || [];
          const lastSession = hist.length > 0 ? hist[hist.length - 1] : null;
          
          const targetSession = (currentId && summary.data.currentSessionType === 'chat') 
            ? { sessionId: currentId, status: 'active', type: 'chat', startedAt: new Date().toISOString() }
            : lastSession ? { ...lastSession, type: 'chat' } : null;

          if (targetSession) {
            setActiveSession(targetSession);
            setSessionStatus(targetSession.status);
            activeSessionRef.current = targetSession;

            if (targetSession.status === 'active') {
               setIsActiveMode(true);
               const timer = await chatService.getTimerStatus(targetSession.sessionId);
               if (timer.success) setElapsedTime(timer.data.remainingSeconds || 300);
               
               await connectSocket(targetSession.sessionId);
            } else if (['pending', 'waiting', 'initiated'].includes(targetSession.status)) {
               setIsActiveMode(false); 
               await connectSocket(targetSession.sessionId);
            } else {
               setIsActiveMode(false);
               setElapsedTime(0);
               if (targetSession.status === 'ended') {
                   setShowContinueModal(true);
               }
            }
          }
        }
      } catch (err) {
        console.error('Init Error:', err);
      } finally {
        if(mounted) setLoading(false);
      }
    };

    initChat();
    return () => { mounted = false; cleanup(); };
  }, [orderId, user?._id]);

  // --- 2. Connections ---
  const connectSocket = async (sessionId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    await chatService.connect(token);
    setupSocketListeners();
    chatService.joinSession(sessionId, user!._id);

    if (sessionStatus === 'waiting' || sessionStatus === 'initiated') {
        chatService.startChat(sessionId, user!._id);
    }
  };

  const setupSocketListeners = () => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    // Timer Start
    chatService.on('timer_start', (data: any) => {
      if (data.sessionId === activeSessionRef.current?.sessionId) {
        setIsActiveMode(true);
        setSessionStatus('active');
        setElapsedTime(data.maxDurationSeconds || 300);
        setShowContinueModal(false);
        
        // Auto-Send Kundli
        if (!detailsSentRef.current && kundliData && user?._id && astrologerInfo?._id) {
           const detailsText = `Name: ${kundliData.name}\nDOB: ${kundliData.dob}\nTime: ${kundliData.birthTime}\nPlace: ${kundliData.birthPlace}\nGender: ${kundliData.gender}`;
           
           const tempMsg: Message = {
             _id: `temp-kundli-${Date.now()}`,
             orderId,
             sessionId: data.sessionId,
             senderId: user._id,
             senderModel: 'User',
             content: detailsText,
             type: 'text',
             status: 'sent',
             sentAt: new Date().toISOString()
           };
           setMessages(p => [...p, tempMsg]);
           
           chatService.sendMessage(data.sessionId, detailsText, user._id, astrologerInfo._id, orderId, 'text');
           detailsSentRef.current = true;
        }
      }
    });

    const handleNewMessage = (rawData: any) => {
        console.log('📨 [Chat] Received Raw:', rawData);

        const message: Message = {
            ...rawData,
            _id: rawData._id || rawData.messageId || `socket-${Date.now()}`
        };

        setMessages(prev => {
            if (prev.some(m => m._id === message._id)) return prev;

            if (message.senderModel?.toLowerCase() === 'user') {
                const tempIndex = prev.findIndex(
                    m => m._id.startsWith('temp-') && 
                    m.content === message.content && 
                    m.type === message.type
                );
                
                if (tempIndex > -1) {
                    const newArr = [...prev];
                    newArr[tempIndex] = message;
                    return newArr;
                }
            }

            return [...prev, message];
        });
    };

    chatService.on('chat_message', handleNewMessage);
    chatService.on('new_message', handleNewMessage);

    // Timer Tick
    chatService.on('timer_tick', (data: any) => {
        if (data.remainingSeconds !== undefined) setElapsedTime(data.remainingSeconds);
    });

    // Chat Ended
    chatService.on('chat_ended', () => {
        setIsActiveMode(false);
        setSessionStatus('ended');
        setElapsedTime(0);
        setShowContinueModal(true);
        alert('Chat has ended.');
    });
  };

  const cleanup = () => {
    chatService.off('timer_start');
    chatService.off('chat_message');
    chatService.off('new_message');
    chatService.off('timer_tick');
    chatService.off('chat_ended');
    listenersAttached.current = false;
  };

  // --- 3. Actions ---
  const handleSend = () => {
    if (!inputText.trim() || !user?._id || !astrologerInfo?._id || !activeSession) return;
    
    const content = inputText.trim();
    setInputText('');

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
        _id: tempId,
        orderId,
        sessionId: activeSession.sessionId,
        senderId: user._id,
        senderModel: 'User',
        content,
        type: 'text',
        status: 'sent',
        sentAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);

    chatService.sendMessage(
        activeSession.sessionId,
        content,
        user._id,
        astrologerInfo._id,
        orderId,
        'text'
    );
  };

  const handleEndChat = async () => {
    if (!activeSession) return;
    if (confirm('End chat?')) {
        await chatService.endChat(activeSession.sessionId, 'user_ended');
        setIsActiveMode(false);
        setSessionStatus('ended');
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!isActiveMode || !activeSession) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    chatService.sendTyping(activeSession.sessionId, user!._id, text.length > 0);
    
    if (text.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
            chatService.sendTyping(activeSession.sessionId, user!._id, false);
        }, 2000);
    }
  };

  // --- Helpers ---
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const formatMessageTime = (date: string) => {
    try {
        return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((msg) => {
      if(!msg.sentAt) return;
      const date = new Date(msg.sentAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  // ✅ Render message content based on type
  const renderMessageContent = (msg: Message) => {
    const mediaUrl = msg.fileUrl || msg.mediaUrl || msg.url;

    // Kundli Details
    if (msg.type === 'kundli_details' || (msg.content?.includes('Name:') && msg.content?.includes('DOB:'))) {
      return <KundliCard details={msg.kundliDetails} content={msg.content} />;
    }

    // Audio/Voice Note
    if ((msg.type === 'audio' || msg.type === 'voice_note') && mediaUrl) {
      return <AudioPlayer url={mediaUrl} duration={msg.fileDuration} />;
    }

    // Video
    if (msg.type === 'video' && mediaUrl) {
      return <VideoPlayer url={mediaUrl} thumbnail={msg.thumbnailUrl} />;
    }

    // Image
    if (msg.type === 'image' && mediaUrl) {
      return (
        <div className="space-y-1">
          <ImageViewer url={mediaUrl} />
          {msg.content && <p className="text-sm mt-1">{msg.content}</p>}
        </div>
      );
    }

    // Text (default)
    return <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F7FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5A2CCF]"></div>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen bg-gray-100 pt-16">
      <div className="flex flex-col w-full max-w-lg h-[calc(100vh-64px)] bg-[#EFE7DE] shadow-xl relative">
        
        {/* Header */}
        <div className="bg-[#5A2CCF] px-4 py-3 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="text-white hover:bg-white/20 p-1 rounded-full">
                 <span className="text-xl font-bold">←</span>
              </button>
              
              <img 
                 src={!imgError && (astrologerInfo?.profileImage || astrologerInfo?.profilePicture) ? (astrologerInfo.profileImage || astrologerInfo.profilePicture) : '/default-user.png'}
                 onError={() => setImgError(true)}
                 className="w-10 h-10 rounded-full border border-white object-cover bg-white"
                 alt="Astrologer"
              />
              
              <div>
                 <h3 className="font-bold text-white text-base">{astrologerInfo?.name || 'Astrologer'}</h3>
                 <p className="text-white/80 text-xs">
                    {isActiveMode ? 'Chat in progress' : sessionStatus === 'waiting' ? 'Waiting to connect...' : 'Session Ended'}
                 </p>
              </div>
           </div>
           
           {isActiveMode && (
             <div className="flex items-center gap-2">
                <span className="bg-black/30 text-[#FFD700] px-3 py-1 rounded-full text-sm font-bold">{formatTime(elapsedTime)}</span>
                <button onClick={handleEndChat} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-600">End</button>
             </div>
           )}
        </div>

        {/* Messages List */}
        <div 
            className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar"
            style={{
                backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                backgroundRepeat: 'repeat',
                backgroundColor: '#ECE5DD'
            }}
        >
           {Object.keys(messageGroups).length === 0 && isActiveMode && (
             <div className="flex justify-center mt-10">
                <p className="bg-white/80 px-3 py-1 rounded text-gray-500 text-xs shadow-sm">
                    Session Started. Send a message!
                </p>
             </div>
           )}

           {Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                 <div className="flex justify-center my-4">
                    <span className="bg-[#E1F5FE] text-[#0288D1] text-[11px] px-3 py-1 rounded-full shadow-sm">{date}</span>
                 </div>
                 {msgs.map((msg) => {
                    const isMe = msg.senderModel?.toLowerCase() === 'user';
                    return (
                      <div key={msg._id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                         <div 
                            className={`px-3 py-2 max-w-[85%] rounded-lg text-sm relative shadow-sm 
                            ${isMe ? 'bg-[#7C4DFF] text-white rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}
                         >
                            {/* Tail */}
                            <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent 
                                ${isMe 
                                    ? 'right-1.5 border-t-[#7C4DFF] border-r-0' 
                                    : 'left-1.5 border-t-white border-l-0'}
                            `}></div>
                            
                            {/* ✅ Render based on message type */}
                            {renderMessageContent(msg)}
                            
                            <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                              {formatMessageTime(msg.sentAt)}
                            </span>
                         </div>
                      </div>
                    );
                 })}
              </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {isActiveMode ? (
           <div className="bg-white p-3 flex gap-2 border-t shrink-0 items-center">
              <input 
                value={inputText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 outline-none text-gray-900 text-sm border focus:border-[#5A2CCF] transition-colors"
                disabled={sendingMessage}
              />
              <button 
                onClick={handleSend} 
                disabled={!inputText.trim()} 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${!inputText.trim() ? 'bg-gray-300' : 'bg-[#5A2CCF] hover:bg-[#4823a6]'}`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                 </svg>
              </button>
           </div>
        ) : (
           <div className="bg-gray-200 p-4 text-center text-gray-500 text-sm font-medium shrink-0">
              {sessionStatus === 'waiting' ? 'Waiting for astrologer to join...' : 'This session has ended'}
           </div>
        )}

      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
