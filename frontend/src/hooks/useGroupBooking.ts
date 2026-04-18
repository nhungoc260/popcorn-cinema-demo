import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from './useSocket'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export interface GroupMember {
  userId: string
  name: string
  avatar: string
}

export function useGroupBooking(showtimeId: string) {
  const socket = useSocket()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [roomId, setRoomId] = useState<string | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isInGroup, setIsInGroup] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [hostUserId, setHostUserId] = useState<string | null>(null)

  const hasJoinedRoomRef = useRef<string | null>(null)

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
    return () => { hasJoinedRoomRef.current = null }
  }, [showtimeId])

  // Auto-join từ URL ?groupRoom=...
  useEffect(() => {
    if (!socket || !user) return

    const params = new URLSearchParams(window.location.search)
    let urlRoomId = params.get('groupRoom')

    if (!urlRoomId) {
      const saved = localStorage.getItem('pendingGroupRoom')
      if (saved) { urlRoomId = saved; localStorage.removeItem('pendingGroupRoom') }
    }

    if (!urlRoomId) return
    const roomToJoin = urlRoomId

    const doJoin = () => {
      if (hasJoinedRoomRef.current === roomToJoin) return
      hasJoinedRoomRef.current = roomToJoin
      // Join thẳng, không cần chờ approve
      socket.emit('group:join', { roomId: roomToJoin, user: userInfoRef.current })
      setRoomId(roomToJoin)
    }

    if (socket.connected) { doJoin(); return }
    socket.once('connect', doJoin)
    return () => { socket.off('connect', doJoin) }
  }, [socket, user])

  useEffect(() => {
    if (!socket) return

    const onCreated = ({ roomId }: { roomId: string }) => {
      setRoomId(roomId)
      setIsInGroup(true)
      setIsHost(true)
      setHostUserId(userInfoRef.current.userId)
      setMembers([userInfoRef.current])
    }

    const onJoined = ({ roomId, members, hostUserId }: { roomId: string; members: GroupMember[]; hostUserId: string }) => {
      setRoomId(roomId)
      setMembers(members)
      setIsInGroup(true)
      setHostUserId(hostUserId)
      setIsHost(userInfoRef.current.userId === hostUserId)
    }

    const onMembers = ({ members: newMembers, hostUserId: hid }: { members: GroupMember[]; hostUserId: string }) => {
      setHostUserId(hid)
      setMembers(prev => {
        const prevIds = new Set(prev.map(m => m.userId))
        const newIds  = new Set(newMembers.map(m => m.userId))
        const myId    = userInfoRef.current.userId

        newMembers.forEach(m => {
          if (!prevIds.has(m.userId) && m.userId !== myId) {
            toast(`👋 ${m.name} đã tham gia nhóm!`, {
              icon: '🟢',
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(168,85,247,0.4)' },
              duration: 3000,
            })
          }
        })
        prev.forEach(m => {
          if (!newIds.has(m.userId) && m.userId !== myId) {
            toast(`${m.name} đã rời nhóm`, {
              icon: '🔴',
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(168,85,247,0.2)' },
              duration: 3000,
            })
          }
        })
        return newMembers
      })
    }

    // Bị host kick
    const onKicked = () => {
      setRoomId(null)
      setMembers([])
      setIsInGroup(false)
      setIsHost(false)
      hasJoinedRoomRef.current = null
      const url = new URL(window.location.href)
      url.searchParams.delete('groupRoom')
      window.history.replaceState({}, '', url.toString())
      toast.error('Bạn đã bị host xóa khỏi nhóm', {
        duration: 4000,
        style: { background: '#1a1a2e', color: '#fff' },
      })
    }

    // Phòng hết hạn hoặc lỗi
    const onError = ({ code, message }: { code: string; message: string }) => {
      hasJoinedRoomRef.current = null
      setRoomId(null)
      setMembers([])
      setIsInGroup(false)
      setIsHost(false)
      const url = new URL(window.location.href)
      url.searchParams.delete('groupRoom')
      window.history.replaceState({}, '', url.toString())

      if (code === 'ROOM_EXPIRED') {
        toast.error('Link đặt vé nhóm đã hết hạn (30 phút)', {
          icon: '⏰',
          duration: 5000,
          style: { background: '#1a1a2e', color: '#fff' },
        })
        setTimeout(() => navigate('/showtimes'), 2000)
      } else {
        toast.error(message || 'Lỗi phòng đặt vé', {
          style: { background: '#1a1a2e', color: '#fff' },
        })
        setTimeout(() => navigate('/showtimes'), 2000)
      }
    }

    const onDisconnect = () => { hasJoinedRoomRef.current = null }

    socket.on('group:created',  onCreated)
    socket.on('group:joined',   onJoined)
    socket.on('group:members',  onMembers)
    socket.on('group:kicked',   onKicked)
    socket.on('group:error',    onError)
    socket.on('disconnect',     onDisconnect)

    return () => {
      socket.off('group:created',  onCreated)
      socket.off('group:joined',   onJoined)
      socket.off('group:members',  onMembers)
      socket.off('group:kicked',   onKicked)
      socket.off('group:error',    onError)
      socket.off('disconnect',     onDisconnect)
    }
  }, [socket, navigate])

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
    setIsHost(false)
    hasJoinedRoomRef.current = null
    const url = new URL(window.location.href)
    url.searchParams.delete('groupRoom')
    window.history.replaceState({}, '', url.toString())
  }, [socket, roomId])

  const kickMember = useCallback((targetUserId: string) => {
    if (!socket || !roomId) return
    socket.emit('group:kick', { roomId, targetUserId })
  }, [socket, roomId])

  const getShareLink = useCallback(() => {
    if (!roomId) return ''
    return `${window.location.origin}/seats/${showtimeId}?groupRoom=${roomId}`
  }, [roomId, showtimeId])

  const emitHover = useCallback((seatId: string) => {
    if (!socket || !roomId) return
    socket.emit('group:seat:hover', { roomId, seatId, user: userInfoRef.current })
  }, [socket, roomId])

  return {
    roomId, members, isInGroup, isHost, hostUserId,
    createRoom, leaveRoom, kickMember,
    getShareLink, emitHover,
  }
}