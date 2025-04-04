import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

// 定義用戶類型
interface User {
    id: string;
    socket: Socket;
}

// 定義聊天室類型
interface ChatRoom {
    users: [Socket, Socket];
    timer: NodeJS.Timeout;
}

const waitingQueue: User[] = []; // 等待配對的用戶
const activeRooms: Record<string, ChatRoom> = {}; // { roomId: ChatRoom }

io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // 用戶請求配對
    socket.on("findMatch", () => {
        if (waitingQueue.length > 0) {
            const partner = waitingQueue.shift()!; // 取出第一個等待中的用戶
            const roomId = uuidv4(); // 使用 UUID 生成 roomId

            socket.join(roomId);
            partner.socket.join(roomId);
            activeRooms[roomId] = { users: [socket, partner.socket], timer: null! };

            io.to(roomId).emit("matchSuccess", { roomId });
            console.log(`Match found: ${socket.id} <--> ${partner.id}, Room ID: ${roomId}`);
        } else {
            waitingQueue.push({ id: socket.id, socket });
            console.log(`User ${socket.id} added to waiting queue`);
        }
    });

    // 用戶加入房間
    socket.on("joinRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // 用戶傳送訊息
    socket.on("sendMessage", ({ roomId, message }: { roomId: string; message: string }) => {
        console.log(`Message received in room ${roomId}:`, message);
        socket.to(roomId).emit("receiveMessage", { sender: socket.id, message });
    });

    // 用戶離線處理
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        // 從等待池移除
        const index = waitingQueue.findIndex((user) => user.id === socket.id);
        if (index !== -1) {
            waitingQueue.splice(index, 1);
            console.log(`User ${socket.id} removed from waiting queue`);
        }

        // 檢查是否在聊天室中
        for (const roomId in activeRooms) {
            const { users, timer } = activeRooms[roomId];
            if (users.some((user) => user.id === socket.id)) {
                clearTimeout(timer);
                io.to(roomId).emit("partnerLeft");
                delete activeRooms[roomId];
                console.log(`Chat ended for room: ${roomId}`);
                break;
            }
        }
    });
});

server.listen(3001, () => {
    console.log("Server is running on port 3001");
});
