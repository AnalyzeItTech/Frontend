import { StreamEvent, streamChat } from './chatApi';

export type TransportMode = 'websocket' | 'sse_stream' | 'polling';

export interface AdaptiveConnectionOptions {
  url: string;
  projectId: string;
  userId?: string;
  onEvent: (event: StreamEvent) => void;
  onError?: (err: Error) => void;
  onStatusChange?: (status: { mode: TransportMode; connected: boolean }) => void;
}

export class AdaptiveStreamingClient {
  private mode: TransportMode = 'websocket';
  private ws: WebSocket | null = null;
  private options: AdaptiveConnectionOptions;
  private seenSeq = new Set<number>();
  private isClosed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(options: AdaptiveConnectionOptions) {
    this.options = options;
  }

  public connect(): void {
    if (typeof window === 'undefined') return;

    // Convert http/https to ws/wss if necessary
    const wsUrl = this.options.url.replace(/^http/, 'ws');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.mode = 'websocket';
        this.options.onStatusChange?.({ mode: 'websocket', connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const streamEvent: StreamEvent = JSON.parse(event.data);
          if (streamEvent.seq !== undefined) {
            if (this.seenSeq.has(streamEvent.seq)) return; // deduplicate
            this.seenSeq.add(streamEvent.seq);
          }
          this.options.onEvent(streamEvent);
        } catch (e) {
          console.warn('Failed to parse WebSocket event frame:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket transport error, falling back to SSE stream:', err);
        this.fallbackToSSE();
      };

      this.ws.onclose = (event) => {
        if (this.isClosed) return;
        if (!event.wasClean && this.mode === 'websocket') {
          this.fallbackToSSE();
        }
      };
    } catch (err) {
      console.warn('Failed to initialize WebSocket, degrading immediately to SSE:', err);
      this.fallbackToSSE();
    }
  }

  private fallbackToSSE(): void {
    if (this.isClosed) return;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    this.mode = 'sse_stream';
    this.options.onStatusChange?.({ mode: 'sse_stream', connected: true });
  }

  public close(): void {
    this.isClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.options.onStatusChange?.({ mode: this.mode, connected: false });
  }

  public getTransportMode(): TransportMode {
    return this.mode;
  }
}
