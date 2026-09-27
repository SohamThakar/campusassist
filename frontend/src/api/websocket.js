/**
 * Production-ready WebSocket client helper for CampusAssist.
 * Resolves the appropriate WebSocket URL dynamically:
 * - On HTTPS (production): connects via wss://<domain>/ws/<userId>
 * - On HTTP (local dev): connects via ws://<host>/ws/<userId>
 * Never hardcodes localhost or IP addresses.
 */
export const getWebSocketUrl = (userId) => {
  if (!userId) return null;

  const rawApiUrl = import.meta.env.VITE_API_URL;
  if (!rawApiUrl) {
    // In local development fallback to window.location.host if VITE_API_URL is omitted
    if (import.meta.env.DEV && typeof window !== 'undefined' && window.location) {
      const isSecure = window.location.protocol === 'https:';
      const protocol = isSecure ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/${encodeURIComponent(userId)}`;
    }
    console.error('VITE_API_URL is missing. Unable to construct WebSocket URL.');
    return null;
  }

  try {
    const url = new URL(rawApiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws/${encodeURIComponent(userId)}`;
  } catch (err) {
    console.error('Invalid VITE_API_URL provided for WebSocket URL generation:', rawApiUrl, err);
    return null;
  }
};

/**
 * Creates a managed WebSocket connection with heartbeat and reconnection support.
 */
export class CampusWebSocket {
  constructor(userId, onMessage, onStatusChange) {
    this.userId = userId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.socket = null;
    this.pingInterval = null;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
  }

  connect() {
    const url = getWebSocketUrl(this.userId);
    if (!url) return;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        if (this.onStatusChange) this.onStatusChange('connected');
        // Heartbeat every 30s
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          // Non-JSON message
        }
      };

      this.socket.onclose = () => {
        if (this.onStatusChange) this.onStatusChange('disconnected');
        this.cleanupPing();
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
      };

      this.socket.onerror = () => {
        if (this.socket) this.socket.close();
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
    }
  }

  cleanupPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanupPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
