import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socketInstance: Socket | null = null

export function useSocket() {
  const { token } = useAuthStore()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!token) return

    if (!socketInstance) {
      socketInstance = io(window.location.origin, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      })

      socketInstance.on('connect', () => {
        console.log('✅ socket connected')
        forceUpdate(n => n + 1)
      })
    } else {
      forceUpdate(n => n + 1)
    }

    return () => {}
  }, [token])

  return socketInstance
}

export function useShowtimeSocket(
  showtimeId: string | undefined,
  onSeatLocked: (data: { seatId: string; userId: string }) => void,
  onSeatReleased: (data: { seatId: string }) => void,
  onSeatBooked: (data: { seatIds: string[] }) => void,
) {
  const { token } = useAuthStore()

  const lockedRef = useRef(onSeatLocked)
  const releasedRef = useRef(onSeatReleased)
  const bookedRef = useRef(onSeatBooked)

  useEffect(() => { lockedRef.current = onSeatLocked }, [onSeatLocked])
  useEffect(() => { releasedRef.current = onSeatReleased }, [onSeatReleased])
  useEffect(() => { bookedRef.current = onSeatBooked }, [onSeatBooked])

  useEffect(() => {
    if (!showtimeId || !token) return
    if (!socketInstance) return

    const s = socketInstance

    const handleLocked = (data: { seatId: string; userId: string }) => {
      lockedRef.current(data)
    }

    const handleReleased = (data: { seatId: string }) => {
      releasedRef.current(data)
    }

    const handleBooked = (data: { seatIds: string[] }) => {
      bookedRef.current(data)
    }

    const handleLockedMany = (data: { seatIds: string[]; userId: string }) => {
      data.seatIds.forEach(seatId =>
        lockedRef.current({ seatId, userId: data.userId })
      )
    }

    const handleReleasedMany = (data: { seatIds: string[] }) => {
      data.seatIds.forEach(seatId =>
        releasedRef.current({ seatId })
      )
    }

    // 🔥 FIX: đảm bảo join sau khi connect
    const joinShowtime = () => {
      if (!showtimeId) return
      console.log('🎬 join showtime:', showtimeId)
      s.emit('join:showtime', showtimeId)
    }

    if (s.connected) {
      joinShowtime()
    } else {
      s.once('connect', joinShowtime)
    }

    // 🔥 FIX: reconnect thì join lại
    s.on('connect', joinShowtime)

    s.on('seat:locked', handleLocked)
    s.on('seat:released', handleReleased)
    s.on('seats:booked', handleBooked)
    s.on('seats:locked', handleLockedMany)
    s.on('seats:released', handleReleasedMany)

    return () => {
      if (!socketInstance) return

      s.emit('leave:showtime', showtimeId)

      s.off('connect', joinShowtime)
      s.off('seat:locked', handleLocked)
      s.off('seat:released', handleReleased)
      s.off('seats:booked', handleBooked)
      s.off('seats:locked', handleLockedMany)
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