'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '91' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '44' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '61' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '1' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '971' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '65' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '60' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '977' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '880' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '92' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '94' },
];

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { sendOtp, verifyOtp } = useAuth();
  
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-focus inputs
  useEffect(() => {
    if (isOpen) {
      if (step === 'PHONE') {
        phoneInputRef.current?.focus();
      } else {
        otpInputRef.current?.focus();
      }
    }
  }, [isOpen, step]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('PHONE');
        setPhoneNumber('');
        setOtp('');
        setError(null);
        setResendTimer(0);
        setSelectedCountry(COUNTRIES[0]);
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    // 🔔 Check Notification Permission logic added here
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            setError('Please allow notifications to continue with login.');
            return;
          }
        } catch (e) {
          console.error('Notification permission error', e);
        }
      }
    }

    if (!phoneNumber || phoneNumber.length < 7) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sendOtp(phoneNumber, selectedCountry.dialCode);
      setStep('OTP');
      setResendTimer(30);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phoneNumber, selectedCountry.dialCode, otp);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    setError(null);
    setOtp('');
    try {
      await sendOtp(phoneNumber, selectedCountry.dialCode);
      setResendTimer(30);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendOtp();
  };

  const handleOtpKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerifyOtp();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative mx-4 animate-in zoom-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="from-yellow-400 via-yellow-500 to-yellow-400 p-6 relative">
           <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900">
            {step === 'PHONE' ? 'Welcome Back!' : 'Verify OTP'}
          </h2>
          <p className="text-center text-gray-800 text-sm mt-1 font-medium">
            {step === 'PHONE' 
              ? 'Enter your phone number to continue' 
              : 'Enter the code we sent to your phone'}
          </p>
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {step === 'PHONE' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Phone Number
                </label>
                <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 transition-all shadow-sm">
                  {/* Country Selector */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="px-4 py-3.5 bg-yellow-50 hover:bg-yellow-100 border-r-2 border-gray-200 text-gray-700 flex items-center gap-2 font-semibold transition-colors"
                    >
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span>+{selectedCountry.dialCode}</span>
                      <svg className={`w-4 h-4 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-white border-2 border-yellow-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                        {COUNTRIES.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => { setSelectedCountry(country); setShowCountryDropdown(false); phoneInputRef.current?.focus(); }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-yellow-50 transition-colors ${selectedCountry.code === country.code ? 'bg-yellow-100' : ''}`}
                          >
                            <span className="text-2xl">{country.flag}</span>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-gray-900">{country.name}</p>
                              <p className="text-sm text-gray-600">+{country.dialCode}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    placeholder="Enter phone number"
                    className="flex-1 px-4 py-3.5 outline-none bg-white text-gray-900 font-semibold text-base placeholder:text-gray-400"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setError(null); }}
                    onKeyPress={handlePhoneKeyPress}
                    maxLength={15}
                  />
                </div>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading || phoneNumber.length < 7}
                className="w-full from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Get OTP</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </>
                )}
              </button>
            </div>
          ) : (
             <div className="space-y-6">
              {/* OTP Input Section (Same as before) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Enter OTP</label>
                  <span className="text-sm text-gray-600 font-medium bg-yellow-50 px-3 py-1 rounded-full">{selectedCountry.flag} +{selectedCountry.dialCode} {phoneNumber}</span>
                </div>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  className="w-full text-center text-3xl font-bold tracking-[0.8em] border-2 border-yellow-200 rounded-xl px-4 py-4 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all shadow-sm bg-yellow-50/30 text-gray-900 placeholder:text-gray-300"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(null); }}
                  onKeyPress={handleOtpKeyPress}
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl text-base"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setStep('PHONE'); setOtp(''); setError(null); }} className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors">
                  Change Number
                </button>
                <button onClick={handleResendOtp} disabled={resendTimer > 0 || loading} className="text-sm font-semibold disabled:text-gray-400 text-yellow-600 hover:text-yellow-700 disabled:cursor-not-allowed transition-colors">
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
          <div className="mt-8 pt-6 border-t border-gray-200">
             <p className="text-xs text-center text-gray-500 leading-relaxed">
              By continuing, you agree to our <a href="#" className="text-yellow-600 hover:text-yellow-700 font-medium underline">Terms of Service</a> and <a href="#" className="text-yellow-600 hover:text-yellow-700 font-medium underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}