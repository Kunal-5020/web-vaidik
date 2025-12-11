// src/lib/chatService.ts
import { io, Socket } from 'socket.io-client';
import { apiClient } from './api';

interface Message {
  _id: string;
  orderId: string;
  sessionId?: string;
  senderId: string;
  senderModel: 'User' | 'Astrologer';
  content: string;
  type: 'text' | 'image' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read';
  isStarred?: boolean;
  sentAt: string;
}

interface ConversationData {
  orderId: string;
  astrologer: any;
  messages: Message[];
  activeSession: {
    sessionId: string;
    type: 'chat' | 'call';
    status: 'active' | 'ended' | 'initiated' | 'waiting';
    startedAt: string;
    duration?: number;
  } | null;
  totalMessages: number;
  totalDuration?: number;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
}

class ChatService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isSocketConnected: boolean = false;
  private connectionPromise: Promise<Socket> | null = null; // Prevent multiple connections

  getSocket(): Socket | null {
    return this.socket;
  }

  // Connect to Socket.io
  async connect(token: string, userId?: string): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._establishConnection(token, userId);
    
    try {
        const socket = await this.connectionPromise;
        return socket;
    } finally {
        this.connectionPromise = null;
    }
  }

  private async _establishConnection(token: string, userId?: string): Promise<Socket> {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    return new Promise((resolve, reject) => {
      this.socket = io(`${SOCKET_URL}/chat`, {
        auth: { 
            token,
            userId, // Include if available
            role: 'User' // ✅ FIXED: Match Mobile App Auth
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      // Handle Connection Timeout
      const timeout = setTimeout(() => {
          reject(new Error('Chat socket connect timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ [Chat] Socket connected:', this.socket?.id);
        this.isSocketConnected = true;
        this._reattachListeners(); // Re-attach listeners if reconnected
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ [Chat] Connection error:', error);
        this.isSocketConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 [Chat] Socket disconnected');
        this.isSocketConnected = false;
      });
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isSocketConnected = false;
      console.log('👋 [Chat] Socket disconnected');
    }
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.isSocketConnected && this.socket?.connected === true;
  }

  // Join chat session (for active mode)
  joinSession(sessionId: string, userId: string) {
    if (!this.socket) {
      console.warn('❌ [Chat] Socket not connected, cannot join session');
      return;
    }

    console.log('🔗 [Chat] Joining session:', sessionId);
    this.socket.emit('join_session', { sessionId, userId, role: 'user' });
  }

  // Leave chat session
  leaveSession(sessionId: string, userId: string) {
    if (!this.socket) return;

    console.log('👋 [Chat] Leaving session:', sessionId);
    this.socket.emit('leave_session', { sessionId, userId, role: 'user' });
  }

  // Start chat (after joining session)
  startChat(sessionId: string, userId: string) {
    if (!this.socket) return;

    console.log('🚀 [Chat] Starting chat:', sessionId);
    this.socket.emit('start_chat', { sessionId, userId, role: 'user' });
  }

  // ✅ FIXED: receiverId can be undefined (e.g., if loading)
  sendMessage(
    sessionId: string, 
    content: string, 
    senderId: string, 
    receiverId: string | undefined, 
    orderId: string, 
    type: string = 'text'
  ) {
    if (!this.socket || !this.isConnected()) {
      console.warn('⚠️ [Chat] Socket not connected, attempting to reconnect...');
      return; 
    }

    if (!receiverId) {
        console.error('❌ [Chat] receiverId is missing, cannot send message');
        return;
    }

    const messageData = {
      sessionId,
      senderId,
      senderModel: 'User',
      receiverId,
      receiverModel: 'Astrologer',
      orderId,
      type,
      content,
      message: content, 
      sentAt: new Date().toISOString(),
    };

    console.log('📤 [Chat] Sending message via socket:', messageData);
    this.socket.emit('send_message', messageData);
  }

  // Mark messages as read
  markAsRead(sessionId: string, messageIds: string[], userId: string) {
    if (!this.socket || !this.isConnected()) return;

    this.socket.emit('mark_read', { messageIds, userId, sessionId });
  }

  // Typing indicator
  sendTyping(sessionId: string, userId: string, isTyping: boolean) {
    if (!this.socket || !this.isConnected()) return;

    this.socket.emit('typing', { sessionId, userId, isTyping });
  }

  // Listen to events
  on(event: string, callback: Function) {
    // Store listener
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Attach to socket if connected
    if (this.socket) {
        this.socket.on(event, callback as any);
    }
  }

  // Remove event listener
  off(event: string, callback?: Function) {
    if (callback) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      this.socket?.off(event, callback as any);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  // Internal helper to re-attach listeners on reconnect
  private _reattachListeners() {
      if (!this.socket) return;
      this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(cb => {
              if (!this.socket?.hasListeners(event)) {
                  this.socket?.on(event, cb as any);
              }
          });
      });
  }

  // ============= REST API Methods =============

  /**
   * Initiate new chat session
   */
  async initiateChat(data: {
    astrologerId: string;
    astrologerName: string;
    ratePerMinute: number;
  }): Promise<ApiResponse>  {
    try {
      console.log('💬 [Chat] Initiating chat...', data);

      const response = await apiClient.post('/chat/initiate', {
        astrologerId: data.astrologerId,
        astrologerName: data.astrologerName,
        ratePerMinute: data.ratePerMinute,
      });

      if (response.data.success) {
        console.log('✅ [Chat] Chat initiated:', response.data.data);
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error(response.data.message || 'Failed to initiate chat');
    } catch (error: any) {
      console.error('❌ [Chat] Initiate chat error:', error);
      throw error;
    }
  }

  /**
   * Continue existing conversation
   */
  async continueChat(data: {
    astrologerId: string;
    previousSessionId: string;
    ratePerMinute: number;
  }): Promise<ApiResponse>  {
    try {
      console.log('🔄 [Chat] Continuing chat...', data);

      const response = await apiClient.post('/chat/continue', {
        astrologerId: data.astrologerId,
        previousSessionId: data.previousSessionId,
        ratePerMinute: data.ratePerMinute,
      });

      if (response.data.success) {
        console.log('✅ [Chat] Chat continued:', response.data.data);
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error(response.data.message || 'Failed to continue chat');
    } catch (error: any) {
      console.error('❌ [Chat] Continue chat error:', error);
      throw error;
    }
  }

  // Get conversation (all messages from all sessions for this order)
  async getConversation(orderId: string, page: number = 1, limit: number = 100): Promise<ConversationData> {
    try {
      console.log('📡 [Chat] Fetching conversation:', orderId);

      const response = await apiClient.get(`/chat/conversations/${orderId}/messages`, {
        params: { page, limit },
      });

      if (response.data.success) {
        console.log('✅ [Chat] Conversation fetched:', {
          messages: response.data.data.messages.length,
          activeSession: response.data.data.activeSession,
        });
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to fetch conversation');
    } catch (error: any) {
      console.error('❌ [Chat] Get conversation error:', error);
      throw error;
    }
  }

  // Get session messages
  async getSessionMessages(sessionId: string, page: number = 1, limit: number = 50) {
    try {
      console.log('📡 [Chat] Fetching session messages:', sessionId);

      const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`, {
        params: { page, limit },
      });

      if (response.data.success) {
        console.log('✅ [Chat] Session messages fetched:', response.data.data.messages.length);
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to fetch session messages');
    } catch (error: any) {
      console.error('❌ [Chat] Get session messages error:', error);
      throw error;
    }
  }

  // Star/Unstar message
  async starMessage(messageId: string, sessionId: string) {
    try {
      console.log('⭐ [Chat] Starring message:', messageId);

      const response = await apiClient.post(`/chat/messages/${messageId}/star`, { sessionId });

      if (response.data.success) {
        console.log('✅ [Chat] Message starred');
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to star message');
    } catch (error: any) {
      console.error('❌ [Chat] Star error:', error);
      throw error;
    }
  }

  async unstarMessage(messageId: string, sessionId: string) {
    try {
      console.log('⭐ [Chat] Unstarring message:', messageId);

      const response = await apiClient.delete(`/chat/messages/${messageId}/star`, {
        data: { sessionId }
      });

      if (response.data.success) {
        console.log('✅ [Chat] Message unstarred');
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to unstar message');
    } catch (error: any) {
      console.error('❌ [Chat] Unstar error:', error);
      throw error;
    }
  }

  // Get starred messages for session
  async getStarredMessages(sessionId: string, page: number = 1, limit: number = 50) {
    try {
      console.log('📡 [Chat] Fetching starred messages:', sessionId);

      const response = await apiClient.get(`/chat/sessions/${sessionId}/starred`, {
        params: { page, limit },
      });

      if (response.data.success) {
        console.log('✅ [Chat] Starred messages fetched:', response.data.data.messages.length);
        return response.data;
      }

      throw new Error(response.data.message || 'Failed to fetch starred messages');
    } catch (error: any) {
      console.error('❌ [Chat] Get starred error:', error);
      throw error;
    }
  }

  // ✅ FIXED: Emit end_chat via socket first (for real-time) then API
  async endChat(sessionId: string, reason: string = 'user_ended'): Promise<ApiResponse>  {
    try {
      console.log('🛑 [Chat] Ending chat session:', sessionId);

      // 1. Emit Socket event immediately (Matches Mobile)
      if (this.socket && this.isConnected()) {
          this.socket.emit('end_chat', { sessionId, reason });
      }

      // 2. Call API
      const response = await apiClient.post('/chat/sessions/end', {
        sessionId,
        reason,
      });

      if (response.data.success) {
        console.log('✅ [Chat] Chat session ended');
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error(response.data.message || 'Failed to end chat');
    } catch (error: any) {
      console.error('❌ [Chat] End chat error:', error);
      throw error;
    }
  }

  async getConversationMessages(orderId: string, page: number = 1, limit: number = 50) {
    try {
      console.log('📡 [Chat] Fetching conversation messages:', orderId);

      const response = await apiClient.get(
        `/chat/conversations/${orderId}/messages`,
        { params: { page, limit } },
      );

      if (response.data.success) {
        console.log(
          '✅ [Chat] Messages fetched:',
          response.data.data.messages.length,
        );
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error(response.data.message || 'Failed to fetch messages');
    } catch (error: any) {
      console.error('❌ [Chat] Get conversation messages error:', error);
      throw error;
    }
  }

  async getConversationSummary(orderId: string) {
    try {
      console.log('📡 [Chat] Fetching conversation summary:', orderId);

      const response = await apiClient.get(
        `/chat/conversations/${orderId}/summary`,
      );

      if (response.data.success) {
        console.log('✅ [Chat] Summary fetched');
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error(response.data.message || 'Failed to fetch summary');
    } catch (error: any) {
      console.error('❌ [Chat] Get conversation summary error:', error);
      throw error;
    }
  }

  // ✅ ADDED: Missing getTimerStatus (Required by Chat Screen)
  async getTimerStatus(sessionId: string) {
    try {
      console.log('📡 [Chat] Checking timer status:', sessionId);
      const response = await apiClient.get(`/chat/sessions/${sessionId}/timer`);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      }
      return { success: false, message: 'Failed to get timer status' };
    } catch (error: any) {
      console.error('❌ [Chat] Get timer status error:', error);
      return { success: false, message: error.message };
    }
  }
}

export const chatService = new ChatService();
export default chatService;