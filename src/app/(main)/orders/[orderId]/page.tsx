'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import chatService from '@/lib/chatService'; 
import { useRealTime } from '@/context/RealTimeContext';

// Icons
import { 
  ArrowLeft, Search, Play, Pause, Download, Image as ImageIcon
} from 'lucide-react';

interface Message {
  _id: string;
  senderId: string;
  senderModel: string;
  content: string;
  type: string;
  sentAt: string;
  isStarred?: boolean;
  fileUrl?: string;
  mediaUrl?: string;
  url?: string;
  thumbnailUrl?: string;
  fileDuration?: number;
  fileName?: string;
  kundliDetails?: {
    name: string;
    gender: string;
    dob?: string;
    dateOfBirth?: string;
    birthTime?: string;
    timeOfBirth?: string;
    birthPlace?: string;
    placeOfBirth?: string;
  };
}

// Audio Player Component
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

// Video Player Component
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

// Image Viewer Component
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

// Kundli Details Card
const KundliCard = ({ details }: { details: Message['kundliDetails'] }) => {
  if (!details) return null;

  return (
    <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-3 max-w-[300px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📜</span>
        <span className="font-semibold text-purple-900 text-sm">User Kundli Details</span>
      </div>
      <div className="space-y-1 text-xs text-gray-700">
        {details.name && <div><strong>Name:</strong> {details.name}</div>}
        {details.gender && <div><strong>Gender:</strong> {details.gender}</div>}
        {(details.dob || details.dateOfBirth) && (
          <div><strong>DOB:</strong> {details.dob || details.dateOfBirth}</div>
        )}
        {(details.birthTime || details.timeOfBirth) && (
          <div><strong>Birth Time:</strong> {details.birthTime || details.timeOfBirth}</div>
        )}
        {(details.birthPlace || details.placeOfBirth) && (
          <div><strong>Birth Place:</strong> {details.birthPlace || details.placeOfBirth}</div>
        )}
      </div>
    </div>
  );
};

export default function ChatHistoryScreen() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const orderId = params.orderId as string;

  const { initiateChat } = useRealTime();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [astrologer, setAstrologer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (orderId && user?._id) {
      loadData();
    }
  }, [orderId, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch summary to get Astrologer Details
      const summary = await chatService.getConversationSummary(orderId);
      if (summary.success && summary.data.astrologer) {
          setAstrologer(summary.data.astrologer);
      }

      // 2. Fetch messages
      const msgRes = await chatService.getConversationMessages(orderId, 1, 100);
      if (msgRes.success) {
        const sortedMessages = (msgRes.data.messages || []).sort(
            (a: Message, b: Message) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 2) {
      const results = messages.filter(m => 
        m.content?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleContinue = async () => {
    if (!isAuthenticated) return openLoginModal();
    if (!astrologer) return;
    
    await initiateChat(astrologer);
  };

  const groupMessages = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach((msg) => {
      const date = new Date(msg.sentAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const displayedMessages = searchQuery.length > 2 ? searchResults : messages;
  const messageGroups = groupMessages(displayedMessages);

  // Render message content based on type
  const renderMessageContent = (msg: Message) => {
    const mediaUrl = msg.fileUrl || msg.mediaUrl || msg.url;

    // Kundli Details
    if (msg.type === 'kundli_details' && msg.kundliDetails) {
      return <KundliCard details={msg.kundliDetails} />;
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

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col w-full max-w-lg h-screen bg-[#EFE7DE] shadow-xl relative">
        
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
               <img 
                 src={!imgError && astrologer?.profilePicture ? astrologer.profilePicture : '/vaidiktalklogo.png'}
                 onError={() => setImgError(true)}
                 className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                 alt="Astrologer"
               />
               <div>
                 <h1 className="font-bold text-gray-800 text-sm">{astrologer?.name || 'Astrologer'}</h1>
                 <p className="text-xs text-gray-500">Chat History</p>
               </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white px-4 py-2 border-b shrink-0">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Search in conversation..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full bg-gray-100 pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                />
            </div>
        </div>

        {/* Messages */}
        <div 
            className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar"
            style={{
                backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                backgroundRepeat: 'repeat',
                backgroundColor: '#ECE5DD'
            }}
        >
           {loading ? (
             <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
             </div>
           ) : (
             Object.entries(messageGroups).map(([date, msgs]) => (
                <div key={date}>
                   <div className="flex justify-center my-4">
                      <span className="bg-[#E1F5FE] text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm border border-[#E1F3FB]">
                        {date}
                      </span>
                   </div>
                   {msgs.map((msg) => {
                      const isMe = msg.senderModel?.toLowerCase() === 'user';
                      return (
                        <div key={msg._id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                           <div 
                                className={`px-3 py-2 max-w-[85%] rounded-lg text-sm relative shadow-sm 
                                ${isMe ? 'bg-[#D9FDD3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}
                           >
                              {/* Tail */}
                              <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent 
                                  ${isMe 
                                      ? 'right-1.5 border-t-[#D9FDD3] border-r-0' 
                                      : 'left-1.5 border-t-white border-l-0'}
                              `}></div>

                              {/* Message Content */}
                              {renderMessageContent(msg)}

                              {/* Timestamp */}
                              <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-gray-500' : 'text-gray-400'}`}>
                                {new Date(msg.sentAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                           </div>
                        </div>
                      );
                   })}
                </div>
             ))
           )}
        </div>

        {/* Continue Footer */}
        {astrologer && (
            <div className="bg-white p-4 border-t shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Continue chatting?</p>
                        <p className="text-xs text-green-600 font-bold">₹ {astrologer.chatRate || 10}/min</p>
                    </div>
                    <button 
                        onClick={() => handleContinue()}
                        className="bg-[#FDD835] hover:bg-[#FBC02D] text-black font-semibold py-2 px-6 rounded-lg text-sm shadow-sm transition-colors"
                    >
                        Chat Now
                    </button>
                </div>
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
