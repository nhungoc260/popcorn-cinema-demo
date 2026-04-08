import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { lockSeat, unlockSeat, getSeatLockOwner } from '../config/redis';

let io: Server;

export function initSocket(server: http.Server) {
  io = new Server(server, {
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
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string };
      (socket as any).userId = decoded.id;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;

    // ── Auto join user room để nhận notification cá nhân ──
    socket.join(`user:${userId}`)
    socket.on('join:user', (uid: string) => socket.join(`user:${uid}`))

    // ── Join showtime room ──────────────────────────────
    socket.on('join:showtime', (showtimeId: string) => {
      socket.join(`showtime:${showtimeId}`);
    });

    socket.on('leave:showtime', (showtimeId: string) => {
      socket.leave(`showtime:${showtimeId}`);
    });

    // ── Select seat (lock → notify ALL clients) ────────
    // FIX: Emit tới TẤT CẢ client trong room (kể cả nhân viên/admin)
    socket.on('seat:select', async ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      try {
        const locked = await lockSeat(showtimeId, seatId, userId);
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
        } else {
          const owner = await getSeatLockOwner(showtimeId, seatId);
          socket.emit('seat:select:fail', { seatId, reason: 'Seat already taken', lockedBy: owner });
        }
      } catch (e) {
        socket.emit('seat:select:fail', { seatId, reason: 'Server error' });
      }
    });

    // ── Deselect seat ──────────────────────────────────
    socket.on('seat:deselect', async ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      try {
        const released = await unlockSeat(showtimeId, seatId, userId);
        if (released) {
          // FIX: Emit tới TẤT CẢ (không chỉ người hủy)
          io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
        }
      } catch {}
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
const trackedLocks = new Map<string, Set<string>>(); // showtimeId → Set<seatId>

function startSeatExpiryWatcher() {
  // Mỗi 10 giây, kiểm tra các ghế đang được track có còn lock không
  setInterval(async () => {
    try {
      for (const [showtimeId, seatIds] of trackedLocks.entries()) {
        const toRemove: string[] = [];
        for (const seatId of seatIds) {
          const owner = await getSeatLockOwner(showtimeId, seatId);
          if (!owner) {
            // Ghế đã hết TTL (hoặc bị unlock) — emit cho tất cả
            io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
            toRemove.push(seatId);
          }
        }
        toRemove.forEach(id => seatIds.delete(id));
        if (seatIds.size === 0) trackedLocks.delete(showtimeId);
      }
    } catch (e) {
      // Ignore watcher errors
    }
  }, 10_000); // 10 giây một lần
}

// Hàm này được gọi từ booking.controller khi lock ghế
// để watcher biết cần theo dõi ghế nào
export function trackSeatLock(showtimeId: string, seatIds: string[]) {
  if (!trackedLocks.has(showtimeId)) {
    trackedLocks.set(showtimeId, new Set());
  }
  const set = trackedLocks.get(showtimeId)!;
  seatIds.forEach(id => set.add(id));
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}