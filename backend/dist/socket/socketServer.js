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
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
    });
    // Auth middleware
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
        // ── Auto join user room để nhận notification cá nhân ──
        socket.join(`user:${userId}`);
        socket.on('join:user', (uid) => socket.join(`user:${uid}`));
        // ── Join showtime room ──────────────────────────────
        socket.on('join:showtime', (showtimeId) => {
            socket.join(`showtime:${showtimeId}`);
        });
        socket.on('leave:showtime', (showtimeId) => {
            socket.leave(`showtime:${showtimeId}`);
        });
        // ── Select seat (lock → notify ALL clients) ────────
        // FIX: Emit tới TẤT CẢ client trong room (kể cả nhân viên/admin)
        socket.on('seat:select', async ({ showtimeId, seatId }) => {
            try {
                const locked = await (0, redis_1.lockSeat)(showtimeId, seatId, userId);
                if (locked) {
                    // Emit tới tất cả client trong showtime room (bao gồm nhân viên & admin)
                    io.to(`showtime:${showtimeId}`).emit('seat:locked', {
                        seatId,
                        userId,
                        showtimeId,
                        // Thêm ttl để frontend hiển thị countdown
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
        // ── Deselect seat ──────────────────────────────────
        socket.on('seat:deselect', async ({ showtimeId, seatId }) => {
            try {
                const released = await (0, redis_1.unlockSeat)(showtimeId, seatId, userId);
                if (released) {
                    // FIX: Emit tới TẤT CẢ (không chỉ người hủy)
                    io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
                }
            }
            catch { }
        });
        socket.on('disconnect', () => {
            // TTL/memory cleanup handles expiry automatically
            // Polling bên dưới sẽ emit seat:released khi TTL hết
        });
    });
    // ── FIX QUAN TRỌNG: Poll Redis để detect ghế hết TTL ──
    // Khi Redis TTL tự xóa key sau 5 phút, backend KHÔNG biết → frontend không được thông báo
    // Giải pháp: Track danh sách ghế đang lock, poll mỗi 10 giây, emit seat:released khi mất
    startSeatExpiryWatcher();
    console.log('✅ Socket.io initialized');
    return io;
}
// ── Seat Expiry Watcher ────────────────────────────────
// Track ghế đang lock để phát hiện khi TTL hết và emit realtime
const trackedLocks = new Map(); // showtimeId → Set<seatId>
function startSeatExpiryWatcher() {
    // Mỗi 10 giây, kiểm tra các ghế đang được track có còn lock không
    setInterval(async () => {
        try {
            for (const [showtimeId, seatIds] of trackedLocks.entries()) {
                const toRemove = [];
                for (const seatId of seatIds) {
                    const owner = await (0, redis_1.getSeatLockOwner)(showtimeId, seatId);
                    if (!owner) {
                        // Ghế đã hết TTL (hoặc bị unlock) — emit cho tất cả
                        io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
                        toRemove.push(seatId);
                    }
                }
                toRemove.forEach(id => seatIds.delete(id));
                if (seatIds.size === 0)
                    trackedLocks.delete(showtimeId);
            }
        }
        catch (e) {
            // Ignore watcher errors
        }
    }, 10000); // 10 giây một lần
}
// Hàm này được gọi từ booking.controller khi lock ghế
// để watcher biết cần theo dõi ghế nào
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