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
  const hasJoinedRef = useRef(false) // tránh join 2 lần

  // Dùng useRef để userInfo không thay đổi reference mỗi render
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

  // Join room từ URL khi có đủ socket + user
  useEffect(() => {
    if (!socket || !user || hasJoinedRef.current) return

    const params = new URLSearchParams(window.location.search)
    let urlRoomId = params.get('groupRoom')

    // Fallback: đọc từ localStorage nếu vừa login xong
    if (!urlRoomId) {
      const saved = localStorage.getItem('pendingGroupRoom')
      if (saved) {
        urlRoomId = saved
        localStorage.removeItem('pendingGroupRoom')
      }
    }

    if (!urlRoomId) return

    hasJoinedRef.current = true

    const doJoin = () => {
      socket.emit('group:join', { roomId: urlRoomId, user: userInfoRef.current })
      setRoomId(urlRoomId)
      setIsInGroup(true)
    }

    if (socket.connected) {
      doJoin()
    } else {
      socket.once('connect', doJoin)
    }

    return () => {
      socket.off('connect', doJoin)
    }
  }, [socket, user])

  // Lắng nghe các sự kiện nhóm
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
      alert(message)
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