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
    name?: string;
    roomId?: string;  // Add roomId to track which room the user is in
}

// Define chat room type
interface ChatRoom {
    users: [Socket, Socket];
    timer: NodeJS.Timeout;
    userNames: Record<string, string>;
    pendingNames?: Record<string, string>;  // Store names before both users agree
    pendingResponses: Set<string>;  // Store user IDs who have responded
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

            // Store roomId in user objects
            socket.data.roomId = roomId;
            partner.socket.data.roomId = roomId;

            activeRooms[roomId] = { users: [socket, partner.socket], timer: null!, userNames: {}, pendingNames: {}, pendingResponses: new Set() };

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
        socket.data.roomId = roomId;  // Store roomId in socket data

        // If room exists, add the socket to the room's users array
        if (activeRooms[roomId]) {
            const room = activeRooms[roomId];
            const otherUser = room.users.find(user => user.id !== socket.id);
            if (otherUser) {
                room.users = [socket, otherUser];
            }
        } else {
            // If room doesn't exist, create a new one with the current socket
            // We'll add the second socket when the other user joins
            activeRooms[roomId] = {
                users: [socket, socket], // Initialize with the same socket twice to satisfy the type
                timer: null!,
                userNames: {},
                pendingNames: {},
                pendingResponses: new Set()
            };
            console.log(`New room created: ${roomId}`);
        }

        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // User leaves room
    socket.on("leaveRoom", (roomId: string) => {
        socket.leave(roomId);
        delete socket.data.roomId;  // Remove roomId from socket data

        // Notify other users in the room
        socket.to(roomId).emit("receiveMessage", {
            message: "Partner has left the chat",
            sender: "system"
        });
        console.log(`User ${socket.id} left room ${roomId}`);
    });

    // This is used to leave room without notifying other users
    socket.on("quietLeaveRoom", (roomId: string) => {
        socket.leave(roomId);
        delete socket.data.roomId;  // Remove roomId from socket data

        console.log(`User ${socket.id} left room ${roomId}`);
    });

    // User sends message
    socket.on("sendMessage", ({ roomId, message }: { roomId: string; message: string }) => {
        console.log(`Message received in room ${roomId}:`, message);
        socket.to(roomId).emit("receiveMessage", { sender: socket.id, message });
    });

    // User sends friend request
    socket.on("friendRequest", ({ roomId }: { roomId: string }) => {
        console.log(`Friend request sent in room ${roomId}`);
        socket.to(roomId).emit("friendRequest");
    });

    // User accepts friend request
    socket.on("acceptFriendRequest", ({ roomId, name }: { roomId: string; name: string }) => {
        console.log(`Friend request accepted in room ${roomId}`);
        if (activeRooms[roomId]) {
            const room = activeRooms[roomId];
            room.pendingNames = room.pendingNames || {};
            room.pendingResponses = room.pendingResponses || new Set();

            room.pendingNames[socket.id] = name;
            room.pendingResponses.add(socket.id);

            // Check if both users have responded
            const otherUser = room.users.find(user => user.id !== socket.id);
            if (otherUser && room.pendingResponses.has(otherUser.id)) {
                // Both users have responded
                if (room.pendingNames[otherUser.id]) {
                    // Both users accepted, reveal names
                    room.userNames = room.pendingNames;
                    socket.emit("friendRequestAccepted", { name: room.userNames[otherUser.id] });
                    otherUser.emit("friendRequestAccepted", { name: room.userNames[socket.id] });
                } else {
                    // At least one user rejected
                    socket.emit("friendRequestRejected");
                    otherUser.emit("friendRequestRejected");
                }

                // Clean up
                room.pendingNames = undefined;
                room.pendingResponses.clear();
            } else {
                // Only one user has responded, wait for the other
                console.log(`Waiting for other user's response in room ${roomId}`);
            }
        }
    });

    // User rejects friend request
    socket.on("rejectFriendRequest", ({ roomId }: { roomId: string }) => {
        console.log(`Friend request rejected in room ${roomId}`);
        if (activeRooms[roomId]) {
            const room = activeRooms[roomId];
            room.pendingResponses = room.pendingResponses || new Set();
            room.pendingResponses.add(socket.id);

            // Check if both users have responded
            const otherUser = room.users.find(user => user.id !== socket.id);
            if (otherUser && room.pendingResponses.has(otherUser.id)) {
                // Both users have responded
                if (room.pendingNames && room.pendingNames[otherUser.id]) {
                    // Other user accepted but this user rejected
                    socket.emit("friendRequestRejected");
                    otherUser.emit("friendRequestRejected");
                } else {
                    // Both users rejected
                    socket.emit("friendRequestRejected");
                    otherUser.emit("friendRequestRejected");
                }

                // Clean up
                room.pendingNames = undefined;
                room.pendingResponses.clear();
            } else {
                // Only one user has responded, wait for the other
                console.log(`Waiting for other user's response in room ${roomId}`);
            }
        }
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
        const roomId = socket.data.roomId;
        if (roomId && activeRooms[roomId]) {
            const { users, timer } = activeRooms[roomId];
            if (users.some((user) => user.id === socket.id)) {
                clearTimeout(timer);
                io.to(roomId).emit("partnerLeft");
                delete activeRooms[roomId];
                console.log(`Chat ended for room: ${roomId}`);
            }
        }
    });
});

server.listen(3001, () => {
    console.log("Server is running on port 3001");
});
