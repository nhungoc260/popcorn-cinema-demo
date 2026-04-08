import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socketInstance: Socket | null = null

export function useSocket() {
  const { token } = useAuthStore()
  const socket = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return
    if (!socketInstance) {
      socketInstance = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    }
    socket.current = socketInstance
    return () => {
      // Don't disconnect on unmount; keep socket alive
    }
  }, [token])

  return socket.current
}

export function useShowtimeSocket(
  showtimeId: string | undefined,
  onSeatLocked: (data: { seatId: string; userId: string }) => void,
  onSeatReleased: (data: { seatId: string }) => void,
  onSeatBooked: (data: { seatIds: string[] }) => void,
) {
  const { token } = useAuthStore()

  // Dùng ref để tránh stale closure — callback luôn là bản mới nhất
  const lockedRef  = useRef(onSeatLocked)
  const releasedRef = useRef(onSeatReleased)
  const bookedRef  = useRef(onSeatBooked)
  useEffect(() => { lockedRef.current  = onSeatLocked  }, [onSeatLocked])
  useEffect(() => { releasedRef.current = onSeatReleased }, [onSeatReleased])
  useEffect(() => { bookedRef.current  = onSeatBooked  }, [onSeatBooked])

  useEffect(() => {
    if (!showtimeId || !token) return

    if (!socketInstance) {
      socketInstance = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      })
    }
    const s = socketInstance

    const handleLocked   = (data: { seatId: string; userId: string }) => lockedRef.current(data)
    const handleReleased = (data: { seatId: string }) => releasedRef.current(data)
    const handleBooked   = (data: { seatIds: string[] }) => bookedRef.current(data)
    const handleLockedMany = (data: { seatIds: string[]; userId: string }) =>
      data.seatIds.forEach(seatId => lockedRef.current({ seatId, userId: data.userId }))
    const handleReleasedMany = (data: { seatIds: string[] }) =>
      data.seatIds.forEach(seatId => releasedRef.current({ seatId }))

    s.emit('join:showtime', showtimeId)
    s.on('seat:locked',   handleLocked)
    s.on('seat:released', handleReleased)
    s.on('seats:booked',  handleBooked)
    s.on('seats:locked',  handleLockedMany)
    s.on('seats:released', handleReleasedMany)

    return () => {
      s.emit('leave:showtime', showtimeId)
      s.off('seat:locked',   handleLocked)
      s.off('seat:released', handleReleased)
      s.off('seats:booked',  handleBooked)
      s.off('seats:locked',  handleLockedMany)
      s.off('seats:released', handleReleasedMany)
    }
  }, [showtimeId, token])

  const selectSeat = useCallback((seatId: string) => {
    socketInstance?.emit('seat:select', { showtimeId, seatId })
  }, [showtimeId])

  const deselectSeat = useCallback((seatId: string) => {
    socketInstance?.emit('seat:deselect', { showtimeId, seatId })
  }, [showtimeId])

  return { selectSeat, deselectSeat }
}