// src/components/ui/SocketNotificationBridge.tsx
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { addNotification } from '../../hooks/useNotifications'
import api from '../../api'

const TIER_LABEL: Record<string, string> = {
  bronze: '🥉 Đồng',
  silver: '🥈 Bạc',
  gold: '🥇 Vàng',
  platinum: '💎 Kim Cương',
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']

export default function SocketNotificationBridge() {
  const { user, token } = useAuthStore()

  useEffect(() => {
    if (!user || !token) return

    let socket: any = null
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let lastKnownTier = localStorage.getItem('popcorn_last_tier') || 'bronze'
    let lastKnownPoints = 0

    // ── Showtime reminder — nằm TRONG useEffect ──
    const showtimeReminder = setInterval(async () => {
      try {
        const res = await api.get('/bookings/my')
        const bookings = res.data.data || []
        const now = Date.now()
        bookings.forEach((b: any) => {
          if (b.status !== 'confirmed') return
          const startTime = new Date(b.showtime?.startTime).getTime()
          const diffMin = (startTime - now) / 60000
          if (diffMin > 58 && diffMin < 62) {
            const key = `reminded_60_${b._id}`
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, '1')
              addNotification({
                type: 'showtime_reminder',
                title: '🎬 Sắp đến giờ chiếu!',
                message: `${b.showtime?.movie?.title} chiếu lúc ${new Date(b.showtime?.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} tại ${b.showtime?.theater?.name}`,
                meta: b,
              })
            }
          }
          if (diffMin > 13 && diffMin < 17) {
            const key = `reminded_15_${b._id}`
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, '1')
              addNotification({
                type: 'showtime_reminder',
                title: '⏰ 15 phút nữa chiếu!',
                message: `${b.showtime?.movie?.title} — Ghế ${b.seatLabels?.join(', ')} tại ${b.showtime?.theater?.name}. Chuẩn bị vào rạp!`,
                meta: b,
              })
            }
          }
        })
      } catch {}
    }, 5 * 60 * 1000)

    const startPollingFallback = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get('/membership/me')
          const data = res.data.data
          if (!data) return
          const currentTier = data.tier || 'bronze'
          const currentPoints = data.points || 0
          if (TIER_ORDER.indexOf(currentTier) > TIER_ORDER.indexOf(lastKnownTier)) {
            localStorage.setItem('popcorn_last_tier', currentTier)
            addNotification({
              type: 'tier_upgrade',
              title: `🎉 Nâng hạng ${TIER_LABEL[currentTier]}!`,
              message: `Chúc mừng! Bạn đã đạt hạng ${TIER_LABEL[currentTier]} với ${currentPoints} điểm`,
              meta: { tier: currentTier, points: currentPoints },
            })
            lastKnownTier = currentTier
          }
          if (currentPoints > lastKnownPoints && lastKnownPoints > 0) {
            const gained = currentPoints - lastKnownPoints
            addNotification({
              type: 'payment_confirmed',
              title: '✅ Vé đã được xác nhận',
              message: `+${gained} điểm tích lũy. Tổng: ${currentPoints} điểm`,
              meta: { points: currentPoints, tier: currentTier },
            })
          }
          lastKnownPoints = currentPoints
          lastKnownTier = currentTier
        } catch {}
      }, 15000)
    }

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client')
        socket = io(window.location.origin, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 2000,
        })
        socket.on('connect', () => {
          socket.emit('join:user', user.id || (user as any)._id)
        })
        socket.on('payment:confirmed', (data: any) => {
          addNotification({
            type: 'payment_confirmed',
            title: '✅ Thanh toán thành công',
            message: `Mã vé ${data.bookingCode} đã xác nhận. +${data.pointsEarned} điểm tích lũy`,
            meta: data,
          })
          const lastTier = localStorage.getItem('popcorn_last_tier') || 'bronze'
          const newTier = data.newLoyaltyTier || 'bronze'
          if (TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(lastTier)) {
            localStorage.setItem('popcorn_last_tier', newTier)
            addNotification({
              type: 'tier_upgrade',
              title: `🎉 Nâng hạng ${TIER_LABEL[newTier]}!`,
              message: `Chúc mừng! Bạn đã đạt hạng ${TIER_LABEL[newTier]} với ${data.newLoyaltyPoints} điểm`,
              meta: { tier: newTier, points: data.newLoyaltyPoints },
            })
          } else {
            localStorage.setItem('popcorn_last_tier', newTier)
          }
        })
        socket.on('payment:rejected', (data: any) => {
          addNotification({
            type: 'payment_rejected',
            title: '❌ Thanh toán bị từ chối',
            message: data.reason || 'Giao dịch không được xác nhận. Vui lòng thử lại.',
            meta: data,
          })
        })
      } catch {
        startPollingFallback()
      }
    }

    initSocket()

    return () => {
      if (socket) { socket.disconnect(); socket = null }
      if (pollInterval) clearInterval(pollInterval)
      clearInterval(showtimeReminder)
    }
  }, [user?.id, token])

  return null
}