import { type Socket, io } from 'socket.io-client';
import type { BakoSafeConnector } from './BakoSafeConnector';
import { APP_URL, SOCKET_URL } from './constants';
import { WINDOW } from './constants';
import {
  BakoSafeConnectorEvents,
  BakoSafeUsernames,
  type ICreateClientSocket,
  type IResponseAuthConfirmed,
  type IResponseTxCofirmed,
  type ISocketAuth,
  type ISocketMessage,
} from './types';

const DEFAULT_SOCKET_AUTH: Omit<ISocketAuth, 'sessionId'> = {
  username: BakoSafeUsernames.CONNECTOR,
  data: new Date(),
  origin: WINDOW.origin ?? APP_URL,
};

export class SocketClient {
  private static instance: SocketClient | null = null;
  private connecting = false;
  server: Socket;
  events: BakoSafeConnector;
  request_id: string;

  private constructor({ sessionId, events }: ICreateClientSocket) {
    this.request_id = crypto.randomUUID();

    this.server = io(SOCKET_URL, {
      auth: {
        ...DEFAULT_SOCKET_AUTH,
        sessionId,
        request_id: this.request_id,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.server?.on(
      BakoSafeConnectorEvents.DEFAULT,
      (data: ISocketMessage<IResponseTxCofirmed | IResponseAuthConfirmed>) => {
        if (data.to === DEFAULT_SOCKET_AUTH.username) {
          this.events.emit(data.type, {
            from: data.username,
            data: data.data,
          });
        }
      },
    );

    this.events = events;
    this.setupEventListeners();
    this.connect();
  }

  private setupEventListeners(): void {
    this.server.on('connect', () => {
      this.connecting = false;
    });

    this.server.on('connect_error', () => {
      this.connecting = false;
    });

    this.server.on(
      BakoSafeConnectorEvents.DEFAULT,
      (data: ISocketMessage<IResponseTxCofirmed | IResponseAuthConfirmed>) => {
        if (data.to === DEFAULT_SOCKET_AUTH.username) {
          this.events.emit(data.type, {
            from: data.username,
            data: data.data,
          });
        }
      },
    );
  }

  static create(options: ICreateClientSocket) {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient(options);
    }

    return SocketClient.instance;
  }

  connect(): void {
    if (this.isConnected || this.connecting) return;

    this.connecting = true;
    this.server.connect();
  }

  get isConnected(): boolean {
    return this.server.connected;
  }

  checkConnection(): void {
    if (this.isConnected || this.connecting) return;
    this.connect();
  }
}
