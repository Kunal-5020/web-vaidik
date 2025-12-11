'use client';

import React, { useState, useEffect } from 'react';
import { useRealTime } from '../../context/RealTimeContext';

export default function CallWaitingModal() {
  const { callWaitingVisible, pendingCallSession, cancelCall } = useRealTime();
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  useEffect(() => {
    if (!callWaitingVisible) {
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
  }, [callWaitingVisible]);

  if (!callWaitingVisible || !pendingCallSession) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercentage = (timeLeft / 180) * 100;
  const isVideo = pendingCallSession.callType === 'video';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500">
              <img
                src={pendingCallSession.astrologer.image || 'https://i.pravatar.cc/100'}
                alt={pendingCallSession.astrologer.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {pendingCallSession.astrologer.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  ₹{pendingCallSession.ratePerMinute}/min
                </span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {isVideo ? 'Video' : 'Audio'} Call
                </span>
              </div>
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
                  stroke="#10b981"
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">
                Calling astrologer...
              </p>
            </div>
            {pendingCallSession.queuePosition && (
              <p className="text-xs text-gray-600 mt-1">
                Queue position: {pendingCallSession.queuePosition}
              </p>
            )}
          </div>

          {/* Cancel Button */}
          <button
            onClick={cancelCall}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Cancel Call
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
