import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { lockSeat, unlockSeat, getSeatLockOwner } from '../config/redis';

let io: Server;

const groupRooms = new Map<string, { members: Map<string, { userId: string; name: string; avatar: string }> }>()

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

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

    socket.join(`user:${userId}`)
    socket.on('join:user', (uid: string) => socket.join(`user:${uid}`))

    socket.on('join:showtime', (showtimeId: string) => {
      socket.join(`showtime:${showtimeId}`);
    });

    socket.on('leave:showtime', (showtimeId: string) => {
      socket.leave(`showtime:${showtimeId}`);
    });

    socket.on('seat:select', async ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      try {
        const locked = await lockSeat(showtimeId, seatId, userId);
        if (locked) {
          io.to(`showtime:${showtimeId}`).emit('seat:locked', {
            seatId,
            userId,
            showtimeId,
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

    socket.on('seat:deselect', async ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      try {
        const released = await unlockSeat(showtimeId, seatId, userId);
        if (released) {
          io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
        }
      } catch {}
    });

    socket.on('group:create', ({ showtimeId, user }: { showtimeId: string; user: any }) => {
      const roomId = `group_${showtimeId}_${Date.now()}`
      groupRooms.set(roomId, { members: new Map() })
      groupRooms.get(roomId)!.members.set(userId, user)
      socket.join(roomId)
      const members = [...groupRooms.get(roomId)!.members.values()]
      socket.emit('group:created', { roomId })
      socket.emit('group:members', { members })
    })

    socket.on('group:join', ({ roomId, user }: { roomId: string; user: any }) => {
      // Tự tạo lại room nếu không tồn tại (server restart mất RAM)
      if (!groupRooms.has(roomId)) {
        groupRooms.set(roomId, { members: new Map() })
      }
      groupRooms.get(roomId)!.members.set(userId, user)
      socket.join(roomId)
      const members = [...groupRooms.get(roomId)!.members.values()]
      io.to(roomId).emit('group:members', { members })
      socket.emit('group:joined', { roomId, members })
    })

    socket.on('group:seat:hover', ({ roomId, seatId, user }: any) => {
      socket.to(roomId).emit('group:seat:hover', { seatId, user })
    })

    socket.on('group:leave', ({ roomId }: { roomId: string }) => {
      if (groupRooms.has(roomId)) {
        groupRooms.get(roomId)!.members.delete(userId)
        const members = [...groupRooms.get(roomId)!.members.values()]
        io.to(roomId).emit('group:members', { members })
        if (members.length === 0) groupRooms.delete(roomId)
      }
      socket.leave(roomId)
    })

    socket.on('disconnect', () => {
      for (const [roomId, room] of groupRooms.entries()) {
        if (room.members.has(userId)) {
          room.members.delete(userId)
          const members = [...room.members.values()]
          io.to(roomId).emit('group:members', { members })
          if (members.length === 0) groupRooms.delete(roomId)
        }
      }
    });
  });

  startSeatExpiryWatcher();

  console.log('✅ Socket.io initialized');
  return io;
}

const trackedLocks = new Map<string, Set<string>>();

function startSeatExpiryWatcher() {
  setInterval(async () => {
    try {
      for (const [showtimeId, seatIds] of trackedLocks.entries()) {
        const toRemove: string[] = [];
        for (const seatId of seatIds) {
          const owner = await getSeatLockOwner(showtimeId, seatId);
          if (!owner) {
            io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
            toRemove.push(seatId);
          }
        }
        toRemove.forEach(id => seatIds.delete(id));
        if (seatIds.size === 0) trackedLocks.delete(showtimeId);
      }
    } catch (e) {}
  }, 10_000);
}

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