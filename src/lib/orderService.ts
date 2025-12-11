// src/lib/orderService.ts
import { apiClient } from './api';

export const orderService = {
  // Check balance before starting consultation
  async checkBalance(pricePerMinute: number, minimumMinutes: number = 5) {
    try {
      console.log('💰 Checking balance for consultation:', {
        pricePerMinute,
        minimumMinutes,
        requiredAmount: pricePerMinute * minimumMinutes,
      });

      const walletResponse = await apiClient.get('/wallet/stats');
      const currentBalance = walletResponse.data.data.currentBalance;
      const requiredAmount = pricePerMinute * minimumMinutes;
      const hasSufficientBalance = currentBalance >= requiredAmount;

      return {
        success: hasSufficientBalance,
        currentBalance,
        requiredAmount,
        shortfall: hasSufficientBalance ? 0 : requiredAmount - currentBalance,
      };
    } catch (error: any) {
      console.error('❌ Check balance error:', error);
      throw error;
    }
  },

  // Get all conversations (WhatsApp-style list)
  // Backend returns: { conversations: [...], pagination: {...} }
  // Each conversation includes: astrologer profile, lastMessage, category ('chat'|'call'|'both'), etc.
  async getUserConversations(params: { page?: number; limit?: number } = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      console.log('📡 Fetching conversations...', params);

      const response = await apiClient.get('/orders/conversations', {
        params: { page, limit },
      });

      if (response.data.success) {
        console.log('✅ Conversations fetched:', response.data.data.conversations.length);
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to fetch conversations');
    } catch (error: any) {
      console.error('❌ Get conversations error:', error);
      throw error;
    }
  },

  // Get conversation statistics
  async getConversationStats(orderId: string) {
    try {
      console.log('📡 Fetching conversation stats:', orderId);

      const response = await apiClient.get(`/orders/conversations/${orderId}/stats`);

      if (response.data.success) {
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to fetch conversation stats');
    } catch (error: any) {
      console.error('❌ Get conversation stats error:', error);
      throw error;
    }
  },

  // Create consultation order
  async createOrder(orderData: any) {
    try {
      console.log('📡 Creating order...', orderData);
      const response = await apiClient.post('/orders', orderData);

      if (response.data.success) {
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to create order');
    } catch (error: any) {
      console.error('❌ Create order error:', error);
      throw error;
    }
  },

  // Get user orders with pagination and filters
  async getOrders(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  } = {}) {
    try {
      const { page = 1, limit = 20, type, status } = params;
      console.log('📡 Fetching orders...', params);

      const response = await apiClient.get('/orders', {
        params: { page, limit, type, status },
      });

      if (response.data.success) {
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to fetch orders');
    } catch (error: any) {
      console.error('❌ Get orders error:', error);
      throw error;
    }
  },

  // Get order details
  async getOrderDetails(orderId: string) {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to fetch order details');
    } catch (error: any) {
      console.error('❌ Get order details error:', error);
      throw error;
    }
  },

  // Cancel order
  async cancelOrder(orderId: string, reason?: string) {
    try {
      const response = await apiClient.patch(`/orders/${orderId}/cancel`, { reason });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to cancel order');
    } catch (error: any) {
      console.error('❌ Cancel order error:', error);
      throw error;
    }
  },

  // Add review to order
  async addReview(orderId: string, rating: number, review?: string) {
    try {
      const response = await apiClient.post(`/orders/${orderId}/review`, {
        rating,
        review,
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to add review');
    } catch (error: any) {
      console.error('❌ Add review error:', error);
      throw error;
    }
  },
};

export default orderService;