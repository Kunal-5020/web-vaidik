'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import walletService from '../../../lib/walletService';
import Link from 'next/link';

type TabType = 'transactions' | 'logs';

interface Transaction {
  id: string;
  title: string;
  date: string;
  txnId: string;
  amount: string;
  type: 'credit' | 'debit';
  status: string;
}

interface PaymentLog {
  id: string;
  title: string;
  date: string;
  txnId: string;
  amount: string;
  status: string;
  gateway: string;
}

const getTransactionTitle = (txn: any) => {
  switch (txn.type) {
    case 'recharge':
      return `Wallet Recharge${txn.paymentGateway ? ` via ${txn.paymentGateway}` : ''}`;
    case 'refund':
      return 'Refund Received';
    case 'bonus':
      return 'Bonus Money Added';
    case 'deduction':
      const desc = txn.description?.toLowerCase() || '';
      if (desc.includes('chat')) return 'Chat Payment';
      if (desc.includes('call')) return 'Call Payment';
      if (desc.includes('gift')) return 'Gift Sent';
      return 'Payment Deducted';
    default:
      return txn.description || 'Transaction';
  }
};

export default function WalletPage() {
  const { user, fetchUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);

  useEffect(() => {
    loadWalletData();
  }, [activeTab]);

  const loadWalletData = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Refresh user profile to get latest balance
      await fetchUserProfile();

      if (activeTab === 'transactions') {
        // Load all wallet transactions
        const txnResponse = await walletService.getTransactions({
          page: 1,
          limit: 50,
        });

        if (txnResponse.success) {
          const formattedTxns = txnResponse.data.transactions.map((txn: any) => {
            const creditTypes = ['recharge', 'refund', 'bonus'];
            const isCredit = creditTypes.includes(txn.type);

            return {
              id: txn._id,
              title: getTransactionTitle(txn),
              date: new Date(txn.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }),
              txnId: `#${txn.transactionId || txn._id}`,
              amount: isCredit
                ? `+₹${Math.abs(txn.amount).toFixed(0)}`
                : `-₹${Math.abs(txn.amount).toFixed(0)}`,
              type: isCredit ? 'credit' : 'debit',
              status: txn.status,
            };
          });
          setTransactions(formattedTxns);
        }
      } else {
        // Load payment logs
        try {
          const logsResponse = await walletService.getPaymentLogs({
            page: 1,
            limit: 50,
          });

          if (logsResponse.success) {
            const formattedLogs = logsResponse.data.logs.map((log: any) => ({
              id: log._id,
              title: log.description || `Wallet Recharge via ${log.paymentGateway || 'Gateway'}`,
              date: new Date(log.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }),
              txnId: `#${log.paymentId || log._id}`,
              amount: `₹${Math.abs(log.amount).toFixed(0)}`,
              status: log.status,
              gateway: log.paymentGateway || 'N/A',
            }));
            setPaymentLogs(formattedLogs);
          }
        } catch (error) {
          console.error('Payment logs error:', error);
          setPaymentLogs([]);
        }
      }
    } catch (error) {
      console.error('Load wallet data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Balance Card */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 mb-1">Available Balance</p>
            <p className="text-4xl font-bold text-gray-900">
              ₹{user?.wallet?.balance?.toFixed(0) || 0}
            </p>
          </div>
          <Link
            href="/wallet/recharge"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors shadow-sm"
          >
            Recharge
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'transactions'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Wallet Transactions
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Payment Logs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-10 w-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        ) : activeTab === 'transactions' ? (
          transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{txn.title}</h3>
                      <p className="text-sm text-gray-600">{txn.date}</p>
                      <p className="text-xs text-gray-400 mt-1">{txn.txnId}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {txn.amount}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          )
        ) : paymentLogs.length > 0 ? (
          <div className="space-y-3">
            {paymentLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{log.title}</h3>
                    <p className="text-sm text-gray-600">{log.date}</p>
                    <p className="text-xs text-gray-400 mt-1">{log.txnId}</p>
                    {log.gateway && (
                      <p className="text-xs text-gray-500 italic mt-1">via {log.gateway}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{log.amount}</p>
                    <span
                      className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        log.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {log.status === 'completed'
                        ? 'Success'
                        : log.status === 'failed'
                        ? 'Failed'
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No payment logs available</p>
          </div>
        )}
      </div>
    </div>
  );
}
