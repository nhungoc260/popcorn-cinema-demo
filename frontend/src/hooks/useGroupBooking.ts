import { useState, useEffect, useCallback } from 'react'
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

  const userInfo = {
    userId: user?.id || '',
    name: user?.name || 'Khách',
    avatar: user?.avatar || '',
  }

  // Đọc groupRoom từ URL params hoặc localStorage (sau khi login redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let urlRoomId = params.get('groupRoom')

    // Nếu không có trong URL, thử đọc từ localStorage (sau khi login redirect)
    if (!urlRoomId) {
      const saved = localStorage.getItem('pendingGroupRoom')
      if (saved) {
        urlRoomId = saved
        localStorage.removeItem('pendingGroupRoom')
      }
    }

    if (!urlRoomId || !socket || !user) return

    const doJoin = () => {
      socket.emit('group:join', { roomId: urlRoomId, user: userInfo })
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

  useEffect(() => {
    if (!socket) return

    socket.on('group:created', ({ roomId }: { roomId: string }) => {
      setRoomId(roomId)
      setIsInGroup(true)
      setMembers([userInfo])
    })

    socket.on('group:joined', ({ roomId, members }: { roomId: string; members: GroupMember[] }) => {
      setRoomId(roomId)
      setMembers(members)
      setIsInGroup(true)
    })

    socket.on('group:members', ({ members }: { members: GroupMember[] }) => {
      setMembers(members)
    })

    socket.on('group:error', ({ message }: { message: string }) => {
      alert(message)
    })

    return () => {
      socket.off('group:created')
      socket.off('group:joined')
      socket.off('group:members')
      socket.off('group:error')
    }
  }, [socket])

  const createRoom = useCallback(() => {
    if (!socket) return
    socket.emit('group:create', { showtimeId, user: userInfo })
  }, [socket, showtimeId, user])

  const leaveRoom = useCallback(() => {
    if (!socket || !roomId) return
    socket.emit('group:leave', { roomId })
    setRoomId(null)
    setMembers([])
    setIsInGroup(false)
  }, [socket, roomId])

  const getShareLink = useCallback(() => {
    if (!roomId) return ''
    return `${window.location.origin}/seats/${showtimeId}?groupRoom=${roomId}`
  }, [roomId, showtimeId])

  const emitHover = useCallback((seatId: string) => {
    if (!socket || !roomId) return
    socket.emit('group:seat:hover', { roomId, seatId, user: userInfo })
  }, [socket, roomId, user])

  return { roomId, members, isInGroup, createRoom, leaveRoom, getShareLink, emitHover }
}