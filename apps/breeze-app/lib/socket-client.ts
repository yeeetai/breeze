import { io, Socket } from 'socket.io-client';

class SocketClient {
    private socket: Socket | null = null;
    private static instance: SocketClient;

    private constructor() { }

    public static getInstance(): SocketClient {
        if (!SocketClient.instance) {
            SocketClient.instance = new SocketClient();
        }
        return SocketClient.instance;
    }

    public connect(): void {
        if (!this.socket) {
            this.socket = io('https://breeze-server.yeeetai.dev', {
                transports: ['websocket'],
                secure: true
            });

            this.socket.on('connect', () => {
                console.log('Connected to server');
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
            });
        }
    }

    public joinRoom(roomId: string): void {
        if (this.socket) {
            this.socket.emit('joinRoom', roomId);
        }
    }

    public findMatch(): void {
        if (this.socket) {
            this.socket.emit('findMatch');
        }
    }

    public sendMessage(roomId: string, message: string): void {
        if (this.socket) {
            this.socket.emit('sendMessage', { roomId, message });
        }
    }

    public onMatchSuccess(callback: (data: { roomId: string }) => void): void {
        if (this.socket) {
            this.socket.on('matchSuccess', callback);
        }
    }

    public onReceiveMessage(callback: (data: { sender: string; message: string }) => void): void {
        if (this.socket) {
            this.socket.on('receiveMessage', callback);
        }
    }

    public onPartnerLeft(callback: () => void): void {
        if (this.socket) {
            this.socket.on('partnerLeft', callback);
        }
    }

    public leaveRoom(roomId: string) {
        if (this.socket) {
            this.socket.emit("leaveRoom", roomId)
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

export const socketClient = SocketClient.getInstance(); 