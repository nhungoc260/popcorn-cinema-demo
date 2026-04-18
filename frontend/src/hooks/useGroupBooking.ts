import { useState, useEffect, useCallback, useRef } from 'react'
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

  const [roomId, setRoomId] = useState<string | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isInGroup, setIsInGroup] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [hostUserId, setHostUserId] = useState<string | null>(null)
  // userId → seatIds[], track ghế của toàn nhóm
  const [groupSeatMap, setGroupSeatMap] = useState<Record<string, string[]>>({})
  // callback để SeatSelectionPage xử lý khi checkout:ready
  const onCheckoutReadyRef = useRef<((seatIds: string[]) => void) | null>(null)

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
    return () => {
      hasJoinedRoomRef.current = null
    }
  }, [showtimeId])

  // AUTO JOIN
  useEffect(() => {
    if (!socket || !user) return

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

    const tryJoin = () => {
      if (!socket.connected) return
      if (hasJoinedRoomRef.current === roomToJoin) return
      hasJoinedRoomRef.current = roomToJoin
      socket.emit('group:join', { roomId: roomToJoin, user: userInfoRef.current })
      socket.emit('join:showtime', showtimeId)
      setRoomId(roomToJoin)
    }

    tryJoin()
    const interval = setInterval(() => {
      if (!hasJoinedRoomRef.current) tryJoin()
    }, 1000)
    return () => clearInterval(interval)
  }, [socket, user, showtimeId])

  // RECONNECT
  useEffect(() => {
    if (!socket || !roomId) return
    const handleReconnect = () => {
      socket.emit('group:join', { roomId, user: userInfoRef.current })
      socket.emit('join:showtime', showtimeId)
    }
    socket.on('connect', handleReconnect)
    return () => { socket.off('connect', handleReconnect) }
  }, [socket, roomId, showtimeId])

  // EVENTS
  useEffect(() => {
    if (!socket) return

    const onCreated = ({ roomId }: { roomId: string }) => {
      setRoomId(roomId)
      setIsInGroup(true)
      setIsHost(true)
      setHostUserId(userInfoRef.current.userId)
      setMembers([userInfoRef.current])
      setGroupSeatMap({})
    }

    const onJoined = ({ roomId, members, hostUserId, seatMap }: any) => {
      setRoomId(roomId)
      setMembers(members)
      setIsInGroup(true)
      setHostUserId(hostUserId)
      setIsHost(userInfoRef.current.userId === hostUserId)
      // Nhận seatMap hiện tại của phòng khi mới join
      if (seatMap) setGroupSeatMap(seatMap)
    }

    const onMembers = ({ members: newMembers, hostUserId: hid }: any) => {
      setHostUserId(hid)
      setMembers(newMembers)
    }

    // Server broadcast seatMap mỗi khi có thay đổi
    const onSeatMap = ({ seatMap }: { seatMap: Record<string, string[]> }) => {
      setGroupSeatMap(seatMap)
    }

    const onKicked = () => {
      setRoomId(null)
      setMembers([])
      setIsInGroup(false)
      setIsHost(false)
      setGroupSeatMap({})
      hasJoinedRoomRef.current = null
      toast.error('Bạn đã bị host xóa khỏi nhóm')
    }

    const onError = ({ message }: any) => {
      hasJoinedRoomRef.current = null
      setRoomId(null)
      setMembers([])
      setIsInGroup(false)
      setGroupSeatMap({})
      toast.error(message || 'Lỗi phòng')
    }

    const onDisconnect = () => {
      hasJoinedRoomRef.current = null
    }

    // Member nhận thông báo host đã chốt
    const onCheckout = () => {
      toast('👑 Host đã chốt đơn! Vui lòng chờ xác nhận thanh toán...', {
        duration: 6000,
        icon: '🎬',
      })
    }

    // Host nhận allSeatIds từ server → gọi callback để tạo booking
    const onCheckoutReady = ({ allSeatIds }: { allSeatIds: string[] }) => {
      if (onCheckoutReadyRef.current) {
        onCheckoutReadyRef.current(allSeatIds)
      }
    }

    socket.on('group:created', onCreated)
    socket.on('group:joined', onJoined)
    socket.on('group:members', onMembers)
    socket.on('group:seatmap', onSeatMap)
    socket.on('group:kicked', onKicked)
    socket.on('group:error', onError)
    socket.on('disconnect', onDisconnect)
    socket.on('group:checkout', onCheckout)
    socket.on('group:checkout:ready', onCheckoutReady)

    return () => {
      socket.off('group:created', onCreated)
      socket.off('group:joined', onJoined)
      socket.off('group:members', onMembers)
      socket.off('group:seatmap', onSeatMap)
      socket.off('group:kicked', onKicked)
      socket.off('group:error', onError)
      socket.off('disconnect', onDisconnect)
      socket.off('group:checkout', onCheckout)
      socket.off('group:checkout:ready', onCheckoutReady)
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
    setIsHost(false)
    setGroupSeatMap({})
    hasJoinedRoomRef.current = null
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

  // Host emit checkout → server gom seat → trả về group:checkout:ready
  const triggerCheckout = useCallback((onReady: (allSeatIds: string[]) => void) => {
    if (!socket || !roomId || !isHost) return
    onCheckoutReadyRef.current = onReady
    socket.emit('group:checkout', { roomId })
  }, [socket, roomId, isHost])

  // Tổng ghế toàn nhóm (để hiển thị preview trên UI)
  const allGroupSeatIds = Object.values(groupSeatMap).flat()

  return {
    roomId,
    members,
    isInGroup,
    isHost,
    hostUserId,
    groupSeatMap,
    allGroupSeatIds,
    createRoom,
    leaveRoom,
    kickMember,
    getShareLink,
    emitHover,
    triggerCheckout,
  }
}