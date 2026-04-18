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
const ROOM_TTL_MS = 30 * 60 * 1000; // 30 phút
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
    });
    // 🔐 AUTH
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
        console.log('🔌 CONNECT:', userId);
        socket.join(`user:${userId}`);
        socket.on('join:user', (uid) => socket.join(`user:${uid}`));
        socket.on('join:showtime', (showtimeId) => {
            console.log('🎬 join showtime:', showtimeId, userId);
            socket.join(`showtime:${showtimeId}`);
        });
        socket.on('leave:showtime', (showtimeId) => {
            socket.leave(`showtime:${showtimeId}`);
        });
        // ── Seat locking ─────────────────────────────
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
                    socket.emit('seat:select:fail', {
                        seatId,
                        reason: 'Seat already taken',
                        lockedBy: owner
                    });
                }
            }
            catch {
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
        // ── GROUP BOOKING ─────────────────────────────
        // ✅ CREATE ROOM
        socket.on('group:create', ({ showtimeId, user }) => {
            const roomId = `group_${showtimeId}_${Date.now()}`;
            console.log('🆕 CREATE ROOM:', roomId, userId);
            groupRooms.set(roomId, {
                hostUserId: userId,
                members: new Map([[userId, user]]),
                createdAt: Date.now(),
            });
            socket.join(roomId);
            socket.emit('group:created', { roomId });
            socket.emit('group:members', {
                members: [user],
                hostUserId: userId
            });
        });
        // ✅ JOIN ROOM (FIX CHÍNH Ở ĐÂY)
        socket.on('group:join', ({ roomId, user }) => {
            console.log('🚀 JOIN REQUEST:', roomId, userId);
            if (!groupRooms.has(roomId)) {
                console.log('❌ ROOM NOT FOUND:', roomId);
                socket.emit('group:error', {
                    code: 'ROOM_NOT_FOUND',
                    message: 'Phòng không còn tồn tại hoặc đã hết hạn'
                });
                return;
            }
            const room = groupRooms.get(roomId);
            // ⏰ Check TTL
            if (Date.now() - room.createdAt > ROOM_TTL_MS) {
                console.log('⏰ ROOM EXPIRED:', roomId);
                groupRooms.delete(roomId);
                socket.emit('group:error', {
                    code: 'ROOM_EXPIRED',
                    message: 'Link đặt vé nhóm đã hết hạn (30 phút)'
                });
                return;
            }
            // ✅ ADD MEMBER
            room.members.set(userId, user);
            socket.join(roomId);
            const members = [...room.members.values()];
            console.log('✅ JOINED:', roomId, 'members:', members.length);
            socket.emit('group:joined', {
                roomId,
                members,
                hostUserId: room.hostUserId
            });
            io.to(roomId).emit('group:members', {
                members,
                hostUserId: room.hostUserId
            });
        });
        // ✅ KICK
        socket.on('group:kick', ({ roomId, targetUserId }) => {
            const room = groupRooms.get(roomId);
            if (!room || room.hostUserId !== userId)
                return;
            if (targetUserId === userId)
                return;
            room.members.delete(targetUserId);
            const members = [...room.members.values()];
            io.to(`user:${targetUserId}`).emit('group:kicked', { roomId });
            io.to(roomId).emit('group:members', {
                members,
                hostUserId: room.hostUserId
            });
        });
        // Hover realtime
        socket.on('group:seat:hover', ({ roomId, seatId, user }) => {
            socket.to(roomId).emit('group:seat:hover', { seatId, user });
        });
        // Leave
        socket.on('group:leave', ({ roomId }) => {
            if (groupRooms.has(roomId)) {
                const room = groupRooms.get(roomId);
                room.members.delete(userId);
                const members = [...room.members.values()];
                io.to(roomId).emit('group:members', {
                    members,
                    hostUserId: room.hostUserId
                });
                if (members.length === 0) {
                    groupRooms.delete(roomId);
                }
            }
            socket.leave(roomId);
        });
        // Disconnect
        socket.on('disconnect', () => {
            console.log('❌ DISCONNECT:', userId);
            for (const [roomId, room] of groupRooms.entries()) {
                if (room.members.has(userId)) {
                    room.members.delete(userId);
                    const members = [...room.members.values()];
                    io.to(roomId).emit('group:members', {
                        members,
                        hostUserId: room.hostUserId
                    });
                    if (members.length === 0) {
                        groupRooms.delete(roomId);
                    }
                }
            }
        });
    });
    // 🧹 CLEANUP ROOM
    setInterval(() => {
        const now = Date.now();
        for (const [roomId, room] of groupRooms.entries()) {
            if (now - room.createdAt > ROOM_TTL_MS) {
                console.log('🧹 CLEAN ROOM:', roomId);
                io.to(roomId).emit('group:error', {
                    code: 'ROOM_EXPIRED',
                    message: 'Phòng đặt vé đã hết hạn'
                });
                groupRooms.delete(roomId);
            }
        }
    }, 5 * 60 * 1000);
    startSeatExpiryWatcher();
    console.log('✅ Socket.io initialized');
    return io;
}
// ── Seat watcher ─────────────────────────────
const trackedLocks = new Map();
function startSeatExpiryWatcher() {
    setInterval(async () => {
        try {
            for (const [showtimeId, seatIds] of trackedLocks.entries()) {
                const toRemove = [];
                for (const seatId of seatIds) {
                    const owner = await (0, redis_1.getSeatLockOwner)(showtimeId, seatId);
                    if (!owner) {
                        io.to(`showtime:${showtimeId}`).emit('seat:released', {
                            seatId,
                            showtimeId
                        });
                        toRemove.push(seatId);
                    }
                }
                toRemove.forEach(id => seatIds.delete(id));
                if (seatIds.size === 0) {
                    trackedLocks.delete(showtimeId);
                }
            }
        }
        catch { }
    }, 10000);
}
function trackSeatLock(showtimeId, seatIds) {
    if (!trackedLocks.has(showtimeId)) {
        trackedLocks.set(showtimeId, new Set());
    }
    seatIds.forEach(id => trackedLocks.get(showtimeId).add(id));
}
function getIO() {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
}
//# sourceMappingURL=socketServer.js.map