'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useRealTime } from '../../context/RealTimeContext';
import { Astrologer } from '../../lib/types';

interface Props {
  astrologer: Astrologer;
  mode: 'chat' | 'call'; // Add mode prop
}

const AstrologerCard: React.FC<Props> = ({ astrologer, mode }) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { initiateChat, initiateCall, isChatProcessing, isCallProcessing } = useRealTime();
  
  const { tier, availability } = astrologer;

  // Badge styling
  const badgeClasses =
    tier === 'celebrity'
      ? 'bg-black text-yellow-400'
      : tier === 'top_choice' || tier === 'top-choice'
      ? 'bg-green-500 text-white'
      : tier === 'rising_star' || tier === 'rising-star'
      ? 'bg-orange-500 text-white'
      : '';

  // Skills and languages
  const skills = (astrologer.specializations || []).slice(0, 2).join(', ');
  const langs = (astrologer.languages || []).slice(0, 2).join(', ');

  // Wait time calculation
  const waitTime = useMemo(() => {
    if (!availability.isOnline || availability.isAvailable) return 0;
    
    if (!availability.busyUntil) return 5;
    
    const now = new Date();
    const busyUntil = new Date(availability.busyUntil);
    const diffMinutes = Math.ceil((busyUntil.getTime() - now.getTime()) / 60000);
    
    return Math.max(1, diffMinutes);
  }, [availability]);

  const isBusy = availability.isOnline && (!availability.isAvailable || waitTime > 0);

  // Get pricing based on mode
  const price = mode === 'chat' ? astrologer.pricing.chat : astrologer.pricing.call;
  const originalPrice = Math.round((price || 25) * 1.22);

  // Handle action based on mode
  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      if (confirm(`Please login to start a ${mode} consultation`)) {
        router.push('/login');
      }
      return;
    }

    if (!availability.isOnline) {
      alert('Astrologer is currently offline');
      return;
    }

    if (mode === 'chat') {
      await initiateChat(astrologer);
    } else {
      await initiateCall(astrologer, 'audio');
    }
  };

  const isProcessing = mode === 'chat' ? isChatProcessing : isCallProcessing;
  const buttonColor = mode === 'chat' 
    ? 'border-yellow-400 text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
    : 'border-green-500 text-green-600 bg-green-50 hover:bg-green-100';
  const spinnerColor = mode === 'chat' ? 'border-yellow-400' : 'border-green-400';

  return (
    <div 
      className="relative flex bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow text-black cursor-pointer"
      onClick={() => router.push(`/astrologer/${astrologer._id}`)}
    >
      {/* Badge */}
      {tier && tier !== 'none' && (
        <div className={`absolute -top-0.5 -left-0.5 px-2 py-1 rounded-tr-lg rounded-bl-lg text-[10px] font-bold ${badgeClasses}`}>
          {String(tier).replace(/_/g, ' ').replace('-', ' ').toUpperCase()}
        </div>
      )}

      {/* Avatar Section */}
      <div className="w-20 flex flex-col items-center mr-3">
        <img
          src={astrologer.profilePicture || 'https://i.pravatar.cc/100'}
          alt={astrologer.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="mt-1 text-center">
          <div className="text-[10px] text-yellow-500">
            {'⭐'.repeat(Math.round(astrologer.ratings.average || 0))}
          </div>
          <div className="text-[10px] text-gray-500">
            {astrologer.stats.totalOrders} orders
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 ml-1">
        <div className="flex items-center">
          <p className="font-semibold text-[15px] truncate flex-1">{astrologer.name}</p>
          {availability.isOnline && availability.isAvailable && (
            <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
          )}
        </div>

        <p className="text-[12px] text-gray-600 mt-0.5 truncate">{skills}</p>
        <p className="text-[12px] text-gray-600 mt-0.5 truncate">{langs || 'English'}</p>
        <p className="text-[12px] text-gray-600 mt-0.5">Exp: {astrologer.experienceYears || 0} Years</p>

        <div className="flex items-center mt-2">
          <span className="text-[12px] text-gray-400 line-through mr-2">
            ₹{originalPrice}
          </span>
          <span className="text-[14px] font-semibold text-black">
            ₹{price}/min
          </span>
        </div>
      </div>

      {/* Action Section */}
      <div className="flex items-center ml-2">
        {isBusy ? (
          <div className="flex items-center bg-orange-50 px-2 py-1 rounded-md border border-orange-200">
            <span className="text-[12px] text-orange-500 font-semibold whitespace-nowrap">
              Wait ~{waitTime}m
            </span>
          </div>
        ) : (
          <button
            onClick={handleAction}
            disabled={!availability.isOnline || isProcessing}
            className={`px-3 py-2 rounded-md border text-[13px] font-semibold whitespace-nowrap transition-colors ${
              availability.isOnline && !isProcessing
                ? buttonColor
                : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 border-2 ${spinnerColor} border-t-transparent rounded-full animate-spin`} />
                <span>Wait...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {mode === 'chat' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )}
                <span>{availability.isOnline ? (mode === 'chat' ? 'Chat' : 'Call') : 'Offline'}</span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AstrologerCard;
