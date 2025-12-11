// src/lib/chatService.ts
import { apiClient } from './api';

export const chatService = {
  /**
   * Search messages within a specific session (REST)
   */
  async searchMessages(sessionId: string, query: string, page: number = 1) {
    try {
      if (!query.trim()) return { success: true, data: { messages: [] } };
      
      console.log('🔍 Searching messages:', { sessionId, query, page });
      const response = await apiClient.get(`/chat/sessions/${sessionId}/search`, {
        params: { q: query, page, limit: 50 }
      });

      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ Search messages error:', error);
      throw error;
    }
  },

  /**
   * Star a specific message
   */
  async starMessage(messageId: string, sessionId: string) {
    try {
      console.log('⭐ Starring message:', messageId);
      const response = await apiClient.post(`/chat/messages/${messageId}/star`, {
        sessionId
      });

      if (response.status === 201) {
        return response.data;
      }
      console.log('Response data:', response);
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ Star message error:', error);
      throw error;
    }
  },

  /**
   * Unstar a specific message
   */
  async unstarMessage(messageId: string, sessionId: string) {
    try {
      console.log('🚫 Unstarring message:', messageId);
      const response = await apiClient.delete(`/chat/messages/${messageId}/star`, {
        data: { sessionId } // DELETE requests often need body in 'data' prop for axios
      });

      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ Unstar message error:', error);
      throw error;
    }
  },

  /**
   * Delete a message
   * @param deleteFor 'sender' (delete for me) or 'everyone' (delete for all)
   */
  async deleteMessage(messageId: string, deleteFor: 'sender' | 'everyone') {
    try {
      console.log('🗑️ Deleting message:', { messageId, deleteFor });
      const response = await apiClient.post(`/chat/messages/${messageId}/delete`, {
        deleteFor
      });

      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ Delete message error:', error);
      throw error;
    }
  },

  /**
   * Get all starred messages for a specific conversation (Order)
   * This is useful for the "Starred Messages" screen
   */
  async getStarredMessages(orderId: string, page: number = 1) {
    try {
      console.log('🌟 Fetching starred messages for conversation:', orderId);
      const response = await apiClient.get(`/chat/conversations/${orderId}/starred`, {
        params: { page, limit: 100 }
      });

      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ Get starred messages error:', error);
      throw error;
    }
  },

  /**
   * Get media gallery/files for a session (Optional, if you have this endpoint)
   * If not, you can filter regular messages by type 'image' | 'video'
   */

};

export default chatService;