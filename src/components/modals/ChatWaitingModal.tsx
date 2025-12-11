'use client';

import React, { useState, useEffect } from 'react';
import { useRealTime } from '../../context/RealTimeContext';

export default function ChatWaitingModal() {
  const { chatWaitingVisible, pendingChatSession, cancelChat } = useRealTime();
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  useEffect(() => {
    if (!chatWaitingVisible) {
      setTimeLeft(180);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [chatWaitingVisible]);

  if (!chatWaitingVisible || !pendingChatSession) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercentage = (timeLeft / 180) * 100;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-yellow-400 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-400 ">
              <img
                src={pendingChatSession.astrologer.image || 'https://i.pravatar.cc/100'}
                alt={pendingChatSession.astrologer.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {pendingChatSession.astrologer.name}
              </h3>
              <p className="text-sm text-gray-600">
                ₹{pendingChatSession.ratePerMinute}/min
              </p>
            </div>

            {/* Timer Circle */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#f3f4f6"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#fbbf24"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-gray-700">
                Waiting for astrologer to accept...
              </p>
            </div>
            {pendingChatSession.queuePosition && (
              <p className="text-xs text-gray-600 mt-1">
                Queue position: {pendingChatSession.queuePosition}
              </p>
            )}
          </div>

          {/* Cancel Button */}
          <button
            onClick={cancelChat}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
          >
            Cancel Request
          </button>

          {/* Info */}
          <p className="text-xs text-gray-500 text-center mt-3">
            No charges until astrologer accepts
          </p>
        </div>
      </div>
    </div>
  );
}
