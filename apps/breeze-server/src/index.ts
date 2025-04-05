import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

// Define user type
interface User {
    id: string;
    socket: Socket;
}

// Define chat room type
interface ChatRoom {
    users: [Socket, Socket];
    timer: NodeJS.Timeout;
}

const waitingQueue: User[] = []; // Waiting for match users
const activeRooms: Record<string, ChatRoom> = {}; // { roomId: ChatRoom }

io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // User requests match
    socket.on("findMatch", () => {
        if (waitingQueue.length > 0) {
            const partner = waitingQueue.shift()!; // Get the first user in the waiting queue
            const roomId = uuidv4(); // Generate roomId using UUID

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

    // User joins room
    socket.on("joinRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // User leaves room
    socket.on("leaveRoom", (roomId: string) => {
        socket.leave(roomId);
        // Notify other users in the room
        socket.to(roomId).emit("receiveMessage", {
            message: "Partner has left the chat",
            sender: "system"
        });
        console.log(`User ${socket.id} left room ${roomId}`);
    });

    // User sends message
    socket.on("sendMessage", ({ roomId, message }: { roomId: string; message: string }) => {
        console.log(`Message received in room ${roomId}:`, message);
        socket.to(roomId).emit("receiveMessage", { sender: socket.id, message });
    });

    // User offline processing
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove from waiting queue
        const index = waitingQueue.findIndex((user) => user.id === socket.id);
        if (index !== -1) {
            waitingQueue.splice(index, 1);
            console.log(`User ${socket.id} removed from waiting queue`);
        }

        // Check if in chat room
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
