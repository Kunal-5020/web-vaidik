// src/lib/notificationService.ts (NEW FILE)
import { io, Socket } from 'socket.io-client';

class NotificationService {
  private socket: Socket | null = null;

  async connect(token: string): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    return new Promise((resolve, reject) => {
      this.socket = io(`${SOCKET_URL}/notifications`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        console.log('✅ [Notification] Socket connected:', this.socket?.id);
        resolve(this.socket!);
      });

      this.socket.on('connected', (data) => {
        console.log('✅ [Notification] Server confirmed:', data);
      });

      this.socket.on('notification', (notification) => {
        console.log('🔔 [Notification] Received:', notification);
        // Emit to your app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notification-received', { detail: notification }));
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ [Notification] Connection error:', error);
        reject(error);
      });
    });
  }

  on(event: string, callback: Function) {
    if (!this.socket) return;
    this.socket.on(event, callback as any);
  }

  off(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
