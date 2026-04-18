"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.trackSeatLock = trackSeatLock;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../config/redis");
let io;
const groupRooms = new Map();
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token)
            return next(new Error('Authentication required'));
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        socket.join(`user:${userId}`);
        socket.on('join:user', (uid) => socket.join(`user:${uid}`));
        socket.on('join:showtime', (showtimeId) => {
            socket.join(`showtime:${showtimeId}`);
        });
        socket.on('leave:showtime', (showtimeId) => {
            socket.leave(`showtime:${showtimeId}`);
        });
        socket.on('seat:select', async ({ showtimeId, seatId }) => {
            try {
                const locked = await (0, redis_1.lockSeat)(showtimeId, seatId, userId);
                if (locked) {
                    io.to(`showtime:${showtimeId}`).emit('seat:locked', {
                        seatId,
                        userId,
                        showtimeId,
                        expiresAt: Date.now() + (parseInt(process.env.SEAT_LOCK_TTL || '300') * 1000),
                    });
                    socket.emit('seat:select:ok', { seatId });
                }
                else {
                    const owner = await (0, redis_1.getSeatLockOwner)(showtimeId, seatId);
                    socket.emit('seat:select:fail', { seatId, reason: 'Seat already taken', lockedBy: owner });
                }
            }
            catch (e) {
                socket.emit('seat:select:fail', { seatId, reason: 'Server error' });
            }
        });
        socket.on('seat:deselect', async ({ showtimeId, seatId }) => {
            try {
                const released = await (0, redis_1.unlockSeat)(showtimeId, seatId, userId);
                if (released) {
                    io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
                }
            }
            catch { }
        });
        socket.on('group:create', ({ showtimeId, user }) => {
            const roomId = `group_${showtimeId}_${Date.now()}`;
            groupRooms.set(roomId, { members: new Map() });
            groupRooms.get(roomId).members.set(userId, user);
            socket.join(roomId);
            const members = [...groupRooms.get(roomId).members.values()];
            socket.emit('group:created', { roomId });
            socket.emit('group:members', { members });
        });
        socket.on('group:join', ({ roomId, user }) => {
            // Tự tạo lại room nếu không tồn tại (server restart mất RAM)
            if (!groupRooms.has(roomId)) {
                groupRooms.set(roomId, { members: new Map() });
            }
            groupRooms.get(roomId).members.set(userId, user);
            socket.join(roomId);
            const members = [...groupRooms.get(roomId).members.values()];
            io.to(roomId).emit('group:members', { members });
            socket.emit('group:joined', { roomId, members });
        });
        socket.on('group:seat:hover', ({ roomId, seatId, user }) => {
            socket.to(roomId).emit('group:seat:hover', { seatId, user });
        });
        socket.on('group:leave', ({ roomId }) => {
            if (groupRooms.has(roomId)) {
                groupRooms.get(roomId).members.delete(userId);
                const members = [...groupRooms.get(roomId).members.values()];
                io.to(roomId).emit('group:members', { members });
                if (members.length === 0)
                    groupRooms.delete(roomId);
            }
            socket.leave(roomId);
        });
        socket.on('disconnect', () => {
            for (const [roomId, room] of groupRooms.entries()) {
                if (room.members.has(userId)) {
                    room.members.delete(userId);
                    const members = [...room.members.values()];
                    io.to(roomId).emit('group:members', { members });
                    if (members.length === 0)
                        groupRooms.delete(roomId);
                }
            }
        });
    });
    startSeatExpiryWatcher();
    console.log('✅ Socket.io initialized');
    return io;
}
const trackedLocks = new Map();
function startSeatExpiryWatcher() {
    setInterval(async () => {
        try {
            for (const [showtimeId, seatIds] of trackedLocks.entries()) {
                const toRemove = [];
                for (const seatId of seatIds) {
                    const owner = await (0, redis_1.getSeatLockOwner)(showtimeId, seatId);
                    if (!owner) {
                        io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
                        toRemove.push(seatId);
                    }
                }
                toRemove.forEach(id => seatIds.delete(id));
                if (seatIds.size === 0)
                    trackedLocks.delete(showtimeId);
            }
        }
        catch (e) { }
    }, 10000);
}
function trackSeatLock(showtimeId, seatIds) {
    if (!trackedLocks.has(showtimeId)) {
        trackedLocks.set(showtimeId, new Set());
    }
    const set = trackedLocks.get(showtimeId);
    seatIds.forEach(id => set.add(id));
}
function getIO() {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
}
//# sourceMappingURL=socketServer.js.map