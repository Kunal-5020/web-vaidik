// src/lib/walletService.ts
import { apiClient } from './api';

export interface RechargeAmount {
  id: number;
  value: number;
  bonus: string;
  popular?: boolean;
}

export const RECHARGE_AMOUNTS: RechargeAmount[] = [
  { id: 1, value: 50, bonus: '100% Extra' },
  { id: 2, value: 100, bonus: '100% Extra' },
  { id: 3, value: 200, bonus: '100% Extra', popular: true },
  { id: 4, value: 500, bonus: '100% Extra', popular: true },
  { id: 5, value: 1000, bonus: '10% Extra' },
  { id: 6, value: 2000, bonus: '10% Extra' },
  { id: 7, value: 3000, bonus: '10% Extra' },
  { id: 8, value: 4000, bonus: '12% Extra' },
  { id: 9, value: 8000, bonus: '12% Extra' },
  { id: 10, value: 15000, bonus: '15% Extra' },
  { id: 11, value: 20000, bonus: '15% Extra' },
  { id: 12, value: 50000, bonus: '20% Extra' },
  { id: 13, value: 100000, bonus: '20% Extra' },
];

export const calculateBonus = (amount: number) => {
  if (amount >= 100000) return { percentage: 20, amount: amount * 0.2 };
  if (amount >= 50000) return { percentage: 20, amount: amount * 0.2 };
  if (amount >= 20000) return { percentage: 15, amount: amount * 0.15 };
  if (amount >= 15000) return { percentage: 15, amount: amount * 0.15 };
  if (amount >= 8000) return { percentage: 12, amount: amount * 0.12 };
  if (amount >= 4000) return { percentage: 12, amount: amount * 0.12 };
  if (amount >= 1000) return { percentage: 10, amount: amount * 0.1 };
  if (amount >= 50) return { percentage: 100, amount: amount * 1.0 };
  return { percentage: 0, amount: 0 };
};

export const walletService = {
  // Recharge wallet
  async rechargeWallet(data: { amount: number; currency?: string }) {
    console.log('📡 Creating recharge transaction...', data);
    
    if (data.amount < 50) {
      throw new Error('Minimum recharge amount is ₹50');
    }

    const response = await apiClient.post('/wallet/recharge', {
      amount: data.amount,
      currency: data.currency || 'INR',
    });

    if (response.data.success) {
      console.log('✅ Recharge transaction created:', response.data.data);
      return response.data;
    }

    throw new Error(response.data.message || 'Failed to create recharge transaction');
  },

  // Verify payment
  async verifyPayment(data: {
    transactionId: string;
    paymentId: string;
    status: string;
    bonusPercentage?: number;
  }) {
    console.log('📡 Verifying payment...', data);

    const response = await apiClient.post('/wallet/verify-payment', data);

    if (response.data.success) {
      console.log('✅ Payment verified:', response.data.data);
      return response.data;
    }

    throw new Error(response.data.message || 'Payment verification failed');
  },

  // Get wallet stats
  async getWalletStats() {
    console.log('📡 Fetching wallet statistics...');

    const response = await apiClient.get('/wallet/stats');

    if (response.data.success) {
      console.log('✅ Wallet stats fetched:', response.data.data);
      return response.data;
    }

    throw new Error(response.data.message || 'Failed to fetch wallet stats');
  },

  // Get transactions
  async getTransactions(params: { page?: number; limit?: number; type?: string } = {}) {
    console.log('📡 Fetching wallet transactions...', params);

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.type) queryParams.append('type', params.type);

    const response = await apiClient.get(`/wallet/transactions?${queryParams.toString()}`);

    if (response.data.success) {
      console.log('✅ Transactions fetched:', response.data.data.transactions.length, 'items');
      return response.data;
    }

    throw new Error(response.data.message || 'Failed to fetch transactions');
  },

  // Get payment logs
  async getPaymentLogs(params: { page?: number; limit?: number; status?: string } = {}) {
    console.log('📡 Fetching payment logs...', params);

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await apiClient.get(`/wallet/payment-logs?${queryParams.toString()}`);

    if (response.data.success) {
      console.log('✅ Payment logs fetched:', response.data.data.logs.length);
      return response.data;
    }

    throw new Error(response.data.message || 'Failed to fetch payment logs');
  },

  // Refresh balance
  async refreshBalance() {
    try {
      const stats = await this.getWalletStats();
      return stats.data.currentBalance;
    } catch (error) {
      console.error('❌ Refresh balance error:', error);
      throw error;
    }
  },
};

export default walletService;
