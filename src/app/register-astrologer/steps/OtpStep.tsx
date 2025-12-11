'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRegistration } from '../../context/RegistrationContext';
import toast from 'react-hot-toast';

export default function OtpStep() {
  const { verifyOtp, state, sendOtp } = useRegistration();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    try {
      await verifyOtp(code);
    } catch (e) {
      toast.error('Invalid OTP');
    }
  };

  return (
    <div className="p-8">
      <button onClick={() => window.location.reload()} className="text-sm text-gray-500 mb-6">← Change Number</button>
      <h2 className="text-2xl font-bold text-[#5b2b84] mb-2">Verify OTP</h2>
      <p className="text-gray-600 mb-8">Sent to +{state.countryCode} {state.phoneNumber}</p>

      <div className="flex justify-between gap-2 mb-8">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 outline-none focus:border-[#5b2b84] focus:bg-purple-50 transition-all ${digit ? 'border-[#5b2b84] bg-purple-50' : 'border-gray-200'}`}
          />
        ))}
      </div>

      <button 
        onClick={handleSubmit}
        disabled={state.isLoading || otp.join('').length !== 6}
        className="w-full bg-[#5b2b84] text-white font-bold py-4 rounded-xl mb-4 disabled:opacity-50"
      >
        {state.isLoading ? 'Verifying...' : 'Verify & Continue'}
      </button>

      <div className="text-center">
        <button className="text-[#5b2b84] font-semibold text-sm hover:underline">Resend OTP</button>
      </div>
    </div>
  );
}