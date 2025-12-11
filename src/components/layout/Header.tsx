'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';

// Icons
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const OrderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

export default function Header() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsProfileOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          
          {/* Left: Logo */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <img 
              src="/Vaidik-talk1.png" 
              alt="Vaidik Talk Logo" 
              className="h-12 w-auto object-contain" 
            />
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Link 
              href="/astrologers-chat" 
              className="flex items-center gap-2 px-5 py-2.5 text-[15px] font-semibold text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all whitespace-nowrap border border-transparent hover:border-yellow-200"
            >
              <ChatIcon />
              Chat with Astrologer
            </Link>
            <Link 
              href="/astrologers-call" 
              className="flex items-center gap-2 px-5 py-2.5 text-[15px] font-semibold text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all whitespace-nowrap border border-transparent hover:border-yellow-200"
            >
              <PhoneIcon />
              Talk to Astrologer
            </Link>
          </nav>

          {/* Right: Auth Button / Profile */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-black font-bold px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <UserIcon />
                <span className="hidden sm:inline">Login</span>
              </button>
            ) : (
              <div 
                className="relative" 
                ref={dropdownRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors cursor-pointer">
                  <span className="hidden sm:block text-sm font-semibold text-gray-800">
                    {user?.name || 'User'}
                  </span>
                  
                  <div className="w-9 h-9 rounded-full border-2 border-black shadow-sm overflow-hidden">
                    <img 
                      src={user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'user'}`} 
                      alt={user?.name || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <ChevronDownIcon />
                </div>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Profile Header */}
                    <div className=" from-yellow-50 via-orange-50 to-yellow-100 px-6 py-6 border-b border-gray-200">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-3 border-black shadow-lg overflow-hidden ring-4 ring-yellow-200">
                          <img 
                            src={user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'user'}`} 
                            alt={user?.name || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 truncate">
                            {user?.name || 'User'}
                          </h3>
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {user?.phoneNumber || 'Phone not available'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href="/wallet"
                        className="w-full px-6 py-3.5 hover:from-green-50 hover:to-emerald-50 text-gray-700 font-medium transition-all flex items-center justify-between group"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <span className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <WalletIcon />
                          </div>
                          <span className="font-semibold">Wallet</span>
                        </span>
                        <span className="font-bold text-green-600 text-lg">
                          ₹{user?.wallet?.balance || 0}
                        </span>
                      </Link>
                      
                      <Link
                        href="/orders"
                        className="w-full px-6 py-3.5 hover:from-blue-50 hover:to-indigo-50 text-gray-700 font-medium transition-all flex items-center gap-3 group"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <OrderIcon />
                        </div>
                        <span className="font-semibold">Order History</span>
                      </Link>

                      <div className="border-t border-gray-200 my-2 mx-4"></div>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full px-6 py-3.5 hover:from-red-50 hover:to-pink-50 text-gray-700 hover:text-red-600 font-medium transition-all flex items-center gap-3 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <LogoutIcon />
                        </div>
                        <span className="font-semibold">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  );
}
