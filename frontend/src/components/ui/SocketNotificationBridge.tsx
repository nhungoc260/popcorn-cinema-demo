// src/components/ui/SocketNotificationBridge.tsx
// Component này mount 1 lần trong App.tsx, lắng nghe socket events
// và push vào notification store. Không render gì cả.

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

    // Import socket động để không bị lỗi circular
    let socket: any = null

    const initSocket = async () => {
      try {
        // Dùng io từ socket.io-client, connect về backend
        const { io } = await import('socket.io-client')
        socket = io(window.location.origin, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 2000,
        })

        // Join room của user để nhận notification cá nhân
        socket.on('connect', () => {
          socket.emit('join:user', user.id || (user as any)._id)
        })

        // ── Lắng nghe payment:confirmed ──
        socket.on('payment:confirmed', (data: any) => {
          // Thông báo thanh toán thành công
          addNotification({
            type: 'payment_confirmed',
            title: '✅ Thanh toán thành công',
            message: `Mã vé ${data.bookingCode} đã xác nhận. +${data.pointsEarned} điểm tích lũy`,
            meta: data,
          })

          // Check nâng hạng
          const lastTier = localStorage.getItem('popcorn_last_tier') || 'bronze'
          const newTier = data.newLoyaltyTier || 'bronze'
          if (TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(lastTier)) {
            localStorage.setItem('popcorn_last_tier', newTier)
            addNotification({
              type: 'tier_upgrade',
              title: `🎉 Nâng hạng ${TIER_LABEL[newTier]}!`,
              message: `Chúc mừng! Bạn đã đạt hạng ${TIER_LABEL[newTier]} với ${data.newLoyaltyPoints} điểm tích lũy`,
              meta: { tier: newTier, points: data.newLoyaltyPoints },
            })
          } else {
            // Cập nhật tier hiện tại vào localStorage
            localStorage.setItem('popcorn_last_tier', newTier)
          }
        })

        // ── Lắng nghe payment:rejected ──
        socket.on('payment:rejected', (data: any) => {
          addNotification({
            type: 'payment_rejected',
            title: '❌ Thanh toán bị từ chối',
            message: data.reason || 'Giao dịch không được xác nhận. Vui lòng thử lại.',
            meta: data,
          })
        })

        // ── Lắng nghe booking:success ──
        socket.on('booking:success', (data: any) => {
          // Chỉ thêm nếu chưa có payment:confirmed (tránh trùng)
          // booking:success thường đi kèm payment:confirmed nên skip
        })

      } catch (err) {
        // Socket không init được → dùng polling fallback
        startPollingFallback()
      }
    }

    // Fallback: poll API mỗi 15s để check loyalty thay đổi
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let lastKnownTier = localStorage.getItem('popcorn_last_tier') || 'bronze'
    let lastKnownPoints = 0

    const startPollingFallback = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get('/coupons/loyalty')
          const loyalty = res.data.data
          if (!loyalty) return

          const currentTier = loyalty.tier || 'bronze'
          const currentPoints = loyalty.points || 0

          // Phát hiện nâng hạng
          if (TIER_ORDER.indexOf(currentTier) > TIER_ORDER.indexOf(lastKnownTier)) {
            localStorage.setItem('popcorn_last_tier', currentTier)
            addNotification({
              type: 'tier_upgrade',
              title: `🎉 Nâng hạng ${TIER_LABEL[currentTier]}!`,
              message: `Chúc mừng! Bạn đã đạt hạng ${TIER_LABEL[currentTier]} với ${currentPoints} điểm tích lũy`,
              meta: { tier: currentTier, points: currentPoints },
            })
            lastKnownTier = currentTier
          }

          // Phát hiện điểm tăng (booking mới được confirm)
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

    initSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        socket = null
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [user?.id, token])

  // Không render gì
  return null
}