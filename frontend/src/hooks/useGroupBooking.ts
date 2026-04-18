import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'
import { useAuthStore } from '../store/authStore'

export interface GroupMember {
  userId: string
  name: string
  avatar: string
}

export function useGroupBooking(showtimeId: string) {
  const socket = useSocket()
  const { user } = useAuthStore()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isInGroup, setIsInGroup] = useState(false)
  const hasJoinedRef = useRef(false)

  const userInfoRef = useRef({
    userId: user?.id || '',
    name: user?.name || 'Khách',
    avatar: user?.avatar || '',
  })
  useEffect(() => {
    userInfoRef.current = {
      userId: user?.id || '',
      name: user?.name || 'Khách',
      avatar: user?.avatar || '',
    }
  }, [user])

  useEffect(() => {
    if (!socket || !user || hasJoinedRef.current) return

    const params = new URLSearchParams(window.location.search)
    let urlRoomId = params.get('groupRoom')

    if (!urlRoomId) {
      const saved = localStorage.getItem('pendingGroupRoom')
      if (saved) {
        urlRoomId = saved
        localStorage.removeItem('pendingGroupRoom')
      }
    }

    if (!urlRoomId) return

    const roomToJoin = urlRoomId

    const doJoin = () => {
      if (hasJoinedRef.current) return
      hasJoinedRef.current = true
      socket.emit('group:join', { roomId: roomToJoin, user: userInfoRef.current })
      setRoomId(roomToJoin)
      setIsInGroup(true)
    }

    if (socket.connected) {
      doJoin()
      return
    }

    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      if (socket.connected) {
        clearInterval(interval)
        doJoin()
      } else if (attempts >= 10) {
        clearInterval(interval)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [socket, user])

  useEffect(() => {
    if (!socket) return

    const onCreated = ({ roomId }: { roomId: string }) => {
      setRoomId(roomId)
      setIsInGroup(true)
      setMembers([userInfoRef.current])
    }

    const onJoined = ({ roomId, members }: { roomId: string; members: GroupMember[] }) => {
      setRoomId(roomId)
      setMembers(members)
      setIsInGroup(true)
    }

    const onMembers = ({ members }: { members: GroupMember[] }) => {
      setMembers(members)
    }

    const onError = ({ message }: { message: string }) => {
      console.error('group:error', message)
    }

    socket.on('group:created', onCreated)
    socket.on('group:joined', onJoined)
    socket.on('group:members', onMembers)
    socket.on('group:error', onError)

    return () => {
      socket.off('group:created', onCreated)
      socket.off('group:joined', onJoined)
      socket.off('group:members', onMembers)
      socket.off('group:error', onError)
    }
  }, [socket])

  const createRoom = useCallback(() => {
    if (!socket) return
    socket.emit('group:create', { showtimeId, user: userInfoRef.current })
  }, [socket, showtimeId])

  const leaveRoom = useCallback(() => {
    if (!socket || !roomId) return
    socket.emit('group:leave', { roomId })
    setRoomId(null)
    setMembers([])
    setIsInGroup(false)
    hasJoinedRef.current = false
  }, [socket, roomId])

  const getShareLink = useCallback(() => {
    if (!roomId) return ''
    return `${window.location.origin}/seats/${showtimeId}?groupRoom=${roomId}`
  }, [roomId, showtimeId])

  const emitHover = useCallback((seatId: string) => {
    if (!socket || !roomId) return
    socket.emit('group:seat:hover', { roomId, seatId, user: userInfoRef.current })
  }, [socket, roomId])

  return { roomId, members, isInGroup, createRoom, leaveRoom, getShareLink, emitHover }
}