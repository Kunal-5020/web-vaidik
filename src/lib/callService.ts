// src/lib/callService.ts
import { io, Socket } from 'socket.io-client';
import { apiClient } from './api';

// Dynamic import handler for Agora (Client-side only)
let AgoraRTC: any = null;
if (typeof window !== 'undefined') {
  import('agora-rtc-sdk-ng').then((module) => {
    AgoraRTC = module.default;
  });
}

interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
}

class CallService {
  // Agora State
  private client: any = null;
  public localAudioTrack: any = null;
  public localVideoTrack: any = null;
  
  // Socket State
  private socket: Socket | null = null;
  private connectionPromise: Promise<Socket> | null = null;
  
  // Callbacks
  public onUserPublished?: (user: any, mediaType: 'audio' | 'video') => void;
  public onUserUnpublished?: (user: any, mediaType: 'audio' | 'video') => void;
  public onUserLeft?: (user: any) => void;

  // ============================================================
  // 🔌 ROBUST SOCKET CONNECTION
  // ============================================================

  async connectSocket(token: string): Promise<Socket> {
    if (typeof window === 'undefined') return null as any;

    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._establishConnection(token);

    try {
      const socket = await this.connectionPromise;
      return socket;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async _establishConnection(token: string): Promise<Socket> {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    return new Promise((resolve, reject) => {
      const socket = io(`${SOCKET_URL}/calls`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      const timeout = setTimeout(() => {
        reject(new Error('CallSocket connect timeout'));
      }, 10000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        console.log('✅ [Call] Socket connected:', socket.id);
        this.socket = socket;
        resolve(socket);
      });

      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ [Call] Connection error:', error);
        reject(error);
      });
    });
  }

  // ============================================================
  // 📡 SOCKET EMITTERS
  // ============================================================

  emit(event: string, data: any, callback?: Function) {
    if (!this.socket?.connected) {
      console.warn(`⚠️ [Call] Cannot emit "${event}": Socket not connected`);
      return;
    }
    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data?: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  joinSession(sessionId: string, userId: string, role: 'user' | 'astrologer' = 'user') {
    this.emit('join_session', { sessionId, userId, role });
  }

  startCall(sessionId: string, userId: string) {
    this.emit('start_call', { sessionId, userId, role: 'user' });
  }

  syncSession(sessionId: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false });
        return;
      }
      this.emit('sync_timer', { sessionId }, (response: any) => {
        resolve(response);
      });
    });
  }

  // ============================================================
  // 🌐 REST API METHODS
  // ============================================================

  async initiateCall(data: { astrologerId: string; astrologerName: string; callType: 'audio' | 'video'; ratePerMinute: number }): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/calls/initiate', data);
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ [API] Initiate call error:', error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async getCallHistory(params: { page?: number; limit?: number } = {}): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/calls/history', { params });
      if (response.data.success) return { success: true, data: response.data.data };
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async cancelCall(sessionId: string, reason: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(`/calls/sessions/${sessionId}/cancel`, { reason });
      if (response.data.success) return { success: true, data: response.data.data };
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ [API] Cancel call error:', error);
      throw error;
    }
  }

  async endCall(sessionId: string, endedBy: string, reason: string = 'user_ended'): Promise<ApiResponse> {
    try {
      this.emit('end_call', { sessionId, endedBy, reason });
      const response = await apiClient.post('/calls/sessions/end', { sessionId, reason });
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      console.error('❌ [API] End call error:', error);
      throw error;
    }
  }

  // ============================================================
  // 🎥 AGORA WEB SDK LOGIC (Fixed Permission Handling)
  // ============================================================

  async initAgora() {
    if (typeof window === 'undefined') return null;

    if (!AgoraRTC) {
      const module = await import('agora-rtc-sdk-ng');
      AgoraRTC = module.default;
    }

    if (this.client) {
      await this.client.leave();
      this.client = null;
    }

    console.log('🎥 [Agora] Creating client');
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    this.client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
      await this.client.subscribe(user, mediaType);
      console.log('👤 [Agora] User published:', user.uid, mediaType);
      this.onUserPublished?.(user, mediaType);
    });

    this.client.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
      this.onUserUnpublished?.(user, mediaType);
    });

    this.client.on('user-left', (user: any) => {
      this.onUserLeft?.(user);
    });

    return this.client;
  }

  /**
   * Helper: Manually ask for browser permissions with Fallback
   */
  async requestPermissions(video: boolean) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    try {
      console.log(`🎤 [Call] Requesting permissions (Video: ${video})...`);
      
      // 1. Try requested constraints (e.g., Audio + Video)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      
      // Stop stream immediately (we just wanted permission)
      stream.getTracks().forEach(t => t.stop());
      console.log('✅ [Call] Permissions granted (Audio + Video)');
      return;

    } catch (error: any) {
      console.warn('⚠️ [Call] Primary permission request failed:', error.name);

      // 2. Fallback: If Video failed (NotFoundError), try Audio ONLY
      if (video && (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError')) {
        try {
          console.log('🔄 [Call] Retrying with Audio ONLY...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          stream.getTracks().forEach(t => t.stop());
          console.log('✅ [Call] Permissions granted (Audio Only)');
          return; // Success with downgrade
        } catch (innerError: any) {
           // Audio also failed -> Throw critical error
           this.handlePermissionError(innerError);
        }
      }

      // 3. Handle specific errors
      this.handlePermissionError(error);
    }
  }

  private handlePermissionError(error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
         throw new Error('Microphone/Camera permission denied. Please reset permissions in your browser address bar.');
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
         throw new Error('No microphone found. Please connect a microphone to make calls.');
      }
      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
         throw new Error('Microphone/Camera is in use by another application (Zoom/Teams/Meet). Please close it and retry.');
      }
      throw error;
  }

  // ✅ FIXED: Checks permissions first, then joins, then creates tracks safely
  async joinChannel(token: string, channelName: string, uid: number, enableVideo: boolean, appId?: string) {
    // 1. Explicit Permission Check
    await this.requestPermissions(enableVideo);

    // 2. Initialize Client
    if (!this.client) {
        await this.initAgora();
    }

    console.log('🎥 [Agora] Joining channel:', { channelName, uid });

    // 3. Join
    await this.client.join(
      appId || process.env.NEXT_PUBLIC_AGORA_APP_ID,
      channelName,
      token,
      uid
    );

    // 4. Create Tracks (with Try/Catch for robustness)
    const tracks = [];
    try {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      tracks.push(this.localAudioTrack);
    } catch (e: any) {
      console.error('❌ [Agora] Microphone failed:', e);
      throw new Error(e.message || 'Failed to access microphone');
    }

    if (enableVideo) {
      try {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        tracks.push(this.localVideoTrack);
      } catch (e: any) {
        console.warn('⚠️ [Agora] Camera failed (continuing with audio):', e);
      }
    }

    // 5. Publish
    if (tracks.length > 0) {
      await this.client.publish(tracks);
      console.log('✅ [Agora] Published tracks');
    }
  }

  // Toggles
  toggleMic(enabled: boolean) {
    this.localAudioTrack?.setEnabled(enabled);
  }

  toggleVideo(enabled: boolean) {
    this.localVideoTrack?.setEnabled(enabled);
  }

  playLocalVideo(element: HTMLElement) {
    this.localVideoTrack?.play(element);
  }

  // Wrappers for compatibility
  setMicEnabled(e: boolean) { this.toggleMic(e); }
  setVideoEnabled(e: boolean) { this.toggleVideo(e); }
  getLocalVideoTrack() { return this.localVideoTrack; }

  async destroy() {
    console.log('🧹 [Call] Destroying services...');
    this.localAudioTrack?.close();
    this.localVideoTrack?.close();
    if (this.client) {
      await this.client.leave();
      this.client = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const callService = new CallService();
export default callService;