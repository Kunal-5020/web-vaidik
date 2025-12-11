// src/lib/blockingService.ts
import { apiClient } from './api'; // Ensure this points to your axios instance

export interface BlockedAstrologer {
  _id: string;
  astrologer: {
    _id: string;
    name: string;
    profileImage: string;
    specialization?: string[];
  };
  reason: string; // This is the "Report" content
  blockedAt: string;
}

export const blockingService = {
  /**
   * Block an astrologer and submit a report (reason).
   * @param astrologerId - The ID of the astrologer to block
   * @param reason - The report/reason for blocking (min 10 chars)
   */
  async blockAstrologer(astrologerId: string, reason: string) {
    try {
      if (!reason || reason.trim().length < 10) {
        throw new Error('Please provide a reason (minimum 10 characters)');
      }

      console.log('🚫 [BlockingService] Blocking astrologer with report:', astrologerId);

      const response = await apiClient.post('/users/blocking/block', {
        astrologerId,
        reason: reason.trim(),
      });

      if (response.data.success) {
        console.log('✅ [BlockingService] Blocked successfully');
        return {
          success: true,
          message: response.data.message
        };
      }

      throw new Error(response.data.message || 'Failed to block astrologer');
    } catch (error: any) {
      console.error('❌ [BlockingService] Block error:', error);
      throw error;
    }
  },

  /**
   * Get the list of blocked astrologers including the "Report" (reason).
   */
  async getBlockedReports(params: { page?: number; limit?: number } = {}) {
    try {
      console.log('📋 [BlockingService] Fetching blocked list & reports...');
      
      const { page = 1, limit = 20 } = params;
      const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) });

      const response = await apiClient.get(`/users/blocking/list?${queryParams.toString()}`);

      if (response.data.success) {
        console.log('✅ [BlockingService] Reports fetched:', response.data.count);
        return {
          success: true,
          data: response.data.data as BlockedAstrologer[],
          count: response.data.count
        };
      }

      throw new Error(response.data.message || 'Failed to fetch blocked list');
    } catch (error: any) {
      console.error('❌ [BlockingService] Fetch error:', error);
      throw error;
    }
  },

  /**
   * Unblock an astrologer.
   */
  async unblockAstrologer(astrologerId: string) {
    try {
      console.log('🔓 [BlockingService] Unblocking:', astrologerId);

      const response = await apiClient.delete(`/users/blocking/unblock/${astrologerId}`);

      if (response.data.success) {
        return { success: true, message: response.data.message };
      }

      throw new Error(response.data.message || 'Failed to unblock');
    } catch (error: any) {
      console.error('❌ [BlockingService] Unblock error:', error);
      throw error;
    }
  }
};

export default blockingService;