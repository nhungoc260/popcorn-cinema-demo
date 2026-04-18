import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { lockSeat, unlockSeat, getSeatLockOwner } from '../config/redis';

let io: Server;

interface GroupRoom {
  hostUserId: string
  members: Map<string, { userId: string; name: string; avatar: string }>
  createdAt: number
}

const groupRooms = new Map<string, GroupRoom>()
const ROOM_TTL_MS = 30 * 60 * 1000

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

    console.log('🔌 CONNECT:', userId)

    socket.join(`user:${userId}`)

    socket.on('join:user', (uid: string) => socket.join(`user:${uid}`))

    socket.on('join:showtime', (showtimeId: string) => {
      console.log('🎬 join showtime:', showtimeId, userId)
      socket.join(`showtime:${showtimeId}`)
    })

    socket.on('leave:showtime', (showtimeId: string) => {
      socket.leave(`showtime:${showtimeId}`)
    })

    // Seat locking
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
          socket.emit('seat:select:fail', {
            seatId,
            reason: 'Seat already taken',
            lockedBy: owner
          });
        }
      } catch {
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

    // GROUP BOOKING

    socket.on('group:create', ({ showtimeId, user }: { showtimeId: string; user: any }) => {
      const roomId = `group_${showtimeId}_${Date.now()}`

      console.log('🆕 CREATE ROOM:', roomId, userId)

      groupRooms.set(roomId, {
        hostUserId: userId,
        members: new Map([[userId, user]]),
        createdAt: Date.now(),
      })

      socket.join(roomId)

      socket.emit('group:created', { roomId })
      socket.emit('group:members', {
        members: [user],
        hostUserId: userId
      })
    })

    socket.on('group:join', ({ roomId, user }: { roomId: string; user: any }) => {
      console.log('🚀 JOIN REQUEST:', roomId, userId)

      if (!groupRooms.has(roomId)) {
        console.log('❌ ROOM NOT FOUND:', roomId)
        socket.emit('group:error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Phòng không còn tồn tại hoặc đã hết hạn'
        })
        return
      }

      const room = groupRooms.get(roomId)!

      if (Date.now() - room.createdAt > ROOM_TTL_MS) {
        console.log('⏰ ROOM EXPIRED:', roomId)
        groupRooms.delete(roomId)
        socket.emit('group:error', {
          code: 'ROOM_EXPIRED',
          message: 'Link đặt vé nhóm đã hết hạn (30 phút)'
        })
        return
      }

      room.members.set(userId, user)
      socket.join(roomId)

      const members = [...room.members.values()]

      console.log('✅ JOINED:', roomId, 'members:', members.length)

      socket.emit('group:joined', {
        roomId,
        members,
        hostUserId: room.hostUserId
      })

      io.to(roomId).emit('group:members', {
        members,
        hostUserId: room.hostUserId
      })
    })

    socket.on('group:kick', ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
      const room = groupRooms.get(roomId)
      if (!room || room.hostUserId !== userId) return
      if (targetUserId === userId) return

      room.members.delete(targetUserId)

      const members = [...room.members.values()]

      io.to(`user:${targetUserId}`).emit('group:kicked', { roomId })
      io.to(roomId).emit('group:members', {
        members,
        hostUserId: room.hostUserId
      })
    })

    // ✅ HOST CHỐT ĐƠN — chỉ host mới được emit, broadcast cho tất cả member
    socket.on('group:checkout', ({ roomId }: { roomId: string }) => {
      const room = groupRooms.get(roomId)

      if (!room) return
      if (room.hostUserId !== userId) {
        // Không phải host → bỏ qua, không làm gì
        console.log('⛔ Non-host tried to checkout:', userId)
        return
      }

      console.log('✅ HOST CHECKOUT:', roomId, userId)

      // Thông báo tất cả member (trừ host) biết host đã chốt
      socket.to(roomId).emit('group:checkout', { roomId })
    })

    socket.on('group:seat:hover', ({ roomId, seatId, user }: any) => {
      socket.to(roomId).emit('group:seat:hover', { seatId, user })
    })

    socket.on('group:leave', ({ roomId }: { roomId: string }) => {
      if (groupRooms.has(roomId)) {
        const room = groupRooms.get(roomId)!

        room.members.delete(userId)

        const members = [...room.members.values()]

        io.to(roomId).emit('group:members', {
          members,
          hostUserId: room.hostUserId
        })

        if (members.length === 0) {
          groupRooms.delete(roomId)
        }
      }

      socket.leave(roomId)
    })

    socket.on('disconnect', () => {
      console.log('❌ DISCONNECT:', userId)

      for (const [roomId, room] of groupRooms.entries()) {
        if (room.members.has(userId)) {
          room.members.delete(userId)

          const members = [...room.members.values()]

          io.to(roomId).emit('group:members', {
            members,
            hostUserId: room.hostUserId
          })

          if (members.length === 0) {
            groupRooms.delete(roomId)
          }
        }
      }
    });
  });

  setInterval(() => {
    const now = Date.now()

    for (const [roomId, room] of groupRooms.entries()) {
      if (now - room.createdAt > ROOM_TTL_MS) {
        console.log('🧹 CLEAN ROOM:', roomId)
        io.to(roomId).emit('group:error', {
          code: 'ROOM_EXPIRED',
          message: 'Phòng đặt vé đã hết hạn'
        })
        groupRooms.delete(roomId)
      }
    }
  }, 5 * 60 * 1000)

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
            io.to(`showtime:${showtimeId}`).emit('seat:released', {
              seatId,
              showtimeId
            })
            toRemove.push(seatId);
          }
        }

        toRemove.forEach(id => seatIds.delete(id));

        if (seatIds.size === 0) {
          trackedLocks.delete(showtimeId);
        }
      }
    } catch {}
  }, 10000);
}

export function trackSeatLock(showtimeId: string, seatIds: string[]) {
  if (!trackedLocks.has(showtimeId)) {
    trackedLocks.set(showtimeId, new Set());
  }
  seatIds.forEach(id => trackedLocks.get(showtimeId)!.add(id));
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}