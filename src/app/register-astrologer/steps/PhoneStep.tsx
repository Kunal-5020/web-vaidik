'use client';
import React, { useState } from 'react';
import { useRegistration } from '../../context/RegistrationContext';
import toast from 'react-hot-toast';

export default function PhoneStep() {
  const { sendOtp, state } = useRegistration();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('91');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error('Invalid phone number');
    
    try {
      await sendOtp(phone, code);
      toast.success('OTP Sent!');
    } catch (e) {
      toast.error('Failed to send OTP');
    }
  };

  return (
    <div className="p-8 flex flex-col ">
      <h1 className="text-3xl font-extrabold text-[#5b2b84] mb-2">Welcome to VaidikTalk</h1>
      <p className="text-gray-500 mb-8">Register as Astrologer</p>

      <form onSubmit={handleSubmit} className="flex-1">
        <label className="block text-sm font-bold text-gray-700 mb-2">Mobile Number</label>
        <div className="flex gap-3 mb-6">
          <select 
            className="bg-white border-2 border-gray-200 rounded-xl px-3 py-3 text-gray-700 focus:border-[#5b2b84] outline-none font-semibold"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          >
            <option value="91">🇮🇳 +91</option>
            <option value="1">🇺🇸 +1</option>
            <option value="44">🇬🇧 +44</option>
          </select>
          <input 
            type="tel"
            className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-[#5b2b84] outline-none transition-colors"
            placeholder="Enter mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            autoFocus
          />
        </div>

        <button 
          type="submit"
          disabled={state.isLoading || !phone}
          className="w-full bg-[#5b2b84] hover:bg-[#4a236b] text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-200 disabled:opacity-50 transition-all transform active:scale-95"
        >
          {state.isLoading ? 'Sending...' : 'Send OTP'}
        </button>
      </form>
    </div>
  );
}