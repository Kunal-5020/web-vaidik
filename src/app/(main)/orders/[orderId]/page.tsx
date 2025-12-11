'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import chatService from '@/lib/chatService'; 
import { useRealTime } from '@/context/RealTimeContext';

// Icons
import { 
  ArrowLeft, Search, Star, Trash2 
} from 'lucide-react';

interface Message {
  _id: string; // Using _id consistently
  senderId: string;
  senderModel: string;
  content: string;
  type: string;
  sentAt: string;
  isStarred?: boolean;
}

export default function ChatHistoryScreen() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
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
        // Ensure messages are sorted oldest to newest
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
        m.content.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleContinue = async () => {
    if (!isAuthenticated) return router.push('/login');
    if (!astrologer) return;
    
    await initiateChat(astrologer);
  };

  // Grouping Logic
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
  console.log('Message Groups:',astrologer);

  // Helper to get day string for sticky headers (if needed)
  const getDaySeparator = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
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
               {/* Astrologer Image with Fallback */}
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
                      // Case-insensitive check for user model
                      const isMe = msg.senderModel?.toLowerCase() === 'user';
                      return (
                        <div key={msg._id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                           <div 
                                className={`px-3 py-2 max-w-[80%] rounded-lg text-sm relative shadow-sm 
                                ${isMe ? 'bg-[#D9FDD3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}
                           >
                              {/* Tail */}
                              <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent 
                                  ${isMe 
                                      ? 'right-1.5 border-t-[#D9FDD3] border-r-0' 
                                      : 'left-1.5 border-t-white border-l-0'}
                              `}></div>

                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
    </div>
  );
}