import React from 'react';
import { Toaster } from 'react-hot-toast'; // Recommended for alerts
import Image from 'next/image';

export const metadata = {
  title: 'VaidikTalk - Astrologer Registration',
  description: 'Join VaidikTalk as an Astrologer',
};

export default function AstrologerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Replace with your Logo */}
            <Image src="/Vaidik-talk1.png" alt="VaidikTalk Logo" width={200} height={200} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pt-8 mb-4 px-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} VaidikTalk. All rights reserved.
      </footer>
      
      {/* Toast Notifications */}
      <Toaster position="bottom-center" />
    </div>
  );
}