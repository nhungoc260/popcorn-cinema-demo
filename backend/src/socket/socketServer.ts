import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { lockSeat, unlockSeat, getSeatLockOwner } from '../config/redis';

let io: Server;

interface GroupRoom {
  hostUserId: string
  members: Map<string, { userId: string; name: string; avatar: string }>
  seatMap: Map<string, string[]> // userId → seatIds[]
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
    transports: ['polling'],  // bỏ websocket cho Render free
    allowUpgrades: false,     // không upgrade lên websocket
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

    // ── Seat locking ─────────────────────────────
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

          // ✅ Cập nhật seatMap trong group room và broadcast
          for (const [roomId, room] of groupRooms.entries()) {
            if (room.members.has(userId)) {
              const seats = room.seatMap.get(userId) || []
              if (!seats.includes(seatId)) {
                room.seatMap.set(userId, [...seats, seatId])
              }
              // Broadcast toàn bộ seatMap cho cả phòng
              const seatMapObj = Object.fromEntries(
                [...room.seatMap.entries()].map(([uid, sids]) => [uid, sids])
              )
              io.to(roomId).emit('group:seatmap', { seatMap: seatMapObj })
              break
            }
          }
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

          // ✅ Xóa seat khỏi seatMap và broadcast
          for (const [roomId, room] of groupRooms.entries()) {
            if (room.members.has(userId)) {
              const seats = (room.seatMap.get(userId) || []).filter(s => s !== seatId)
              room.seatMap.set(userId, seats)
              const seatMapObj = Object.fromEntries(
                [...room.seatMap.entries()].map(([uid, sids]) => [uid, sids])
              )
              io.to(roomId).emit('group:seatmap', { seatMap: seatMapObj })
              break
            }
          }
        }
      } catch {}
    });

    // ── GROUP BOOKING ─────────────────────────────

    socket.on('group:create', ({ showtimeId, user }: { showtimeId: string; user: any }) => {
      const roomId = `group_${showtimeId}_${Date.now()}`

      console.log('🆕 CREATE ROOM:', roomId, userId)

      groupRooms.set(roomId, {
        hostUserId: userId,
        members: new Map([[userId, user]]),
        seatMap: new Map(),
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

      // Gửi seatMap hiện tại cho member mới join
      const seatMapObj = Object.fromEntries(
        [...room.seatMap.entries()].map(([uid, sids]) => [uid, sids])
      )

      socket.emit('group:joined', {
        roomId,
        members,
        hostUserId: room.hostUserId,
        seatMap: seatMapObj,
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
      room.seatMap.delete(targetUserId)

      const members = [...room.members.values()]

      io.to(`user:${targetUserId}`).emit('group:kicked', { roomId })
      io.to(roomId).emit('group:members', {
        members,
        hostUserId: room.hostUserId
      })

      // Broadcast seatMap sau khi kick
      const seatMapObj = Object.fromEntries(
        [...room.seatMap.entries()].map(([uid, sids]) => [uid, sids])
      )
      io.to(roomId).emit('group:seatmap', { seatMap: seatMapObj })
    })

    // ✅ HOST CHỐT ĐƠN — trả về allSeatIds để host tạo booking
    socket.on('group:checkout', ({ roomId }: { roomId: string }) => {
      const room = groupRooms.get(roomId)

      if (!room) return
      if (room.hostUserId !== userId) {
        console.log('⛔ Non-host tried to checkout:', userId)
        return
      }

      // Gom tất cả seatIds của cả nhóm
      const allSeatIds = Array.from(room.seatMap.values()).flat()

      console.log('✅ HOST CHECKOUT:', roomId, 'allSeats:', allSeatIds)

      // Thông báo member biết host đã chốt
      socket.to(roomId).emit('group:checkout', { roomId })

      // Trả về allSeatIds cho host để tạo booking
      socket.emit('group:checkout:ready', { allSeatIds })
    })

    socket.on('group:booking:done', ({ roomId, bookingId }: { roomId: string; bookingId: string }) => {
      const room = groupRooms.get(roomId)
      if (!room || room.hostUserId !== userId) return
      // Báo tất cả member redirect về trang success
      socket.to(roomId).emit('group:booking:done', { bookingId })
    })
    
    socket.on('group:seat:hover', ({ roomId, seatId, user }: any) => {
      socket.to(roomId).emit('group:seat:hover', { seatId, user })
    })

    socket.on('group:leave', ({ roomId }: { roomId: string }) => {
      if (groupRooms.has(roomId)) {
        const room = groupRooms.get(roomId)!

        room.members.delete(userId)
        room.seatMap.delete(userId)

        const members = [...room.members.values()]

        io.to(roomId).emit('group:members', {
          members,
          hostUserId: room.hostUserId
        })

        // Broadcast seatMap sau khi leave
        const seatMapObj = Object.fromEntries(
          [...room.seatMap.entries()].map(([uid, sids]) => [uid, sids])
        )
        io.to(roomId).emit('group:seatmap', { seatMap: seatMapObj })

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
          room.seatMap.delete(userId)

          const members = [...room.members.values()]

          io.to(roomId).emit('group:members', {
            members,
            hostUserId: room.hostUserId
          })

          const seatMapObj = Object.fromEntries(
            [...room.seatMap.entries()].map(([uid, sids]) => [uid, sids])
          )
          io.to(roomId).emit('group:seatmap', { seatMap: seatMapObj })

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
            io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId })
            toRemove.push(seatId);
          }
        }
        toRemove.forEach(id => seatIds.delete(id));
        if (seatIds.size === 0) trackedLocks.delete(showtimeId);
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