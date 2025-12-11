'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { RECHARGE_AMOUNTS, calculateBonus } from '../../../../lib/walletService';
import walletService from '../../../../lib/walletService';

export default function RechargePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [claimedAmounts, setClaimedAmounts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaimedHistory();
  }, []);

  const loadClaimedHistory = async () => {
    try {
      setLoading(true);
      const logsResponse = await walletService.getPaymentLogs({
        page: 1,
        limit: 100,
        status: 'completed',
      });

      if (logsResponse.success && logsResponse.data?.logs) {
        const history = new Set<number>();
        logsResponse.data.logs.forEach((log: any) => {
          if (log.status === 'completed') {
            history.add(log.amount);
          }
        });
        setClaimedAmounts(history);
      }
    } catch (error) {
      console.error('Load claimed history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (numericAmount < 50) {
      alert('Minimum recharge amount is ₹50');
      return;
    }

    navigateToPayment(numericAmount);
  };

  const navigateToPayment = (value: number) => {
    const isBonusAvailable = !claimedAmounts.has(value);
    router.push(`/wallet/payment?amount=${value}&bonus=${isBonusAvailable}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Add Money to Wallet</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="font-bold text-sm">₹{user?.wallet?.balance?.toFixed(2) || 0}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Manual Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (e.g. 500)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
            <button
              onClick={handleProceed}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-3 rounded-lg transition-colors"
            >
              Proceed
            </button>
          </div>
        </div>

        {/* Predefined Amounts */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Recharge</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {RECHARGE_AMOUNTS.map((item) => {
              const hasBonus = !claimedAmounts.has(item.value);
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigateToPayment(item.value)}
                  className={`relative bg-white rounded-xl border-2 p-6 text-center transition-all hover:shadow-lg ${
                    hasBonus
                      ? 'border-yellow-400 shadow-yellow-100'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {item.popular && (
                    <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-tl-lg rounded-br-lg">
                      ★ POPULAR
                    </span>
                  )}
                  
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    ₹{item.value.toLocaleString()}
                  </p>
                  
                  {hasBonus ? (
                    <p className="text-sm font-semibold text-green-600">{item.bonus}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Bonus Claimed</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
