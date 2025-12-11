'use client';
import React from 'react';
import { useRegistration } from '../../context/RegistrationContext';
import Link from 'next/link';

export default function SuccessStep() {
  const { state } = useRegistration();

  return (
    <div className="h-full bg-[#5b2b84] p-8 flex flex-col text-center justify-center relative overflow-hidden">
       {/* Decorative Background Elements */}
       <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
       
       <h1 className="text-6xl font-black text-white italic transform -rotate-3 mb-2 tracking-tighter">
           Thank
           <br />
           <span className="text-[#ff9a2e] block transform rotate-6 translate-x-4">you!</span>
       </h1>

       <div className="mt-8 mb-8">
           <p className="text-[#E9DFF4] mb-4 text-lg">Your token number is</p>
           <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 inline-block">
               <span className="text-3xl font-bold text-[#ff9a2e] tracking-widest">
                   {state.ticketNumber || 'PENDING'}
               </span>
           </div>
       </div>

       <p className="text-[#D8C9ED] text-sm leading-relaxed max-w-xs mx-auto mb-8">
           Our team will review your application. Reach out to <u className="text-[#ff9a2e]">vaidiktalk@gmail.com</u> for queries.
       </p>

       <Link
  href="/astrologers-chat"
  className="block w-full bg-[#ff9a2e] text-center text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/20 hover:bg-[#e68a1d] transition-colors"
>
  Go to Dashboard
</Link>
    </div>
  );
}