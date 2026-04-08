// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

export interface AppNotification {
  id: string
  type: 'tier_upgrade' | 'payment_confirmed' | 'payment_rejected' | 'booking_success'
  title: string
  message: string
  createdAt: Date
  read: boolean
  meta?: Record<string, any>
}

const STORAGE_KEY = 'popcorn_notifications'
const MAX_NOTIFICATIONS = 30

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw).map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) }))
  } catch {
    return []
  }
}

function saveToStorage(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)))
  } catch {}
}

let _notifications: AppNotification[] = loadFromStorage()
let _listeners: Array<(n: AppNotification[]) => void> = []

function notify(listeners: typeof _listeners, notifications: AppNotification[]) {
  listeners.forEach(fn => fn(notifications))
}

export function addNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  const newN: AppNotification = {
    ...n,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date(),
    read: false,
  }
  _notifications = [newN, ..._notifications].slice(0, MAX_NOTIFICATIONS)
  saveToStorage(_notifications)
  notify(_listeners, _notifications)
  return newN
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(_notifications)
  const { user } = useAuthStore()

  useEffect(() => {
    const listener = (n: AppNotification[]) => setNotifications([...n])
    _listeners.push(listener)
    return () => {
      _listeners = _listeners.filter(l => l !== listener)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const handlePaymentConfirmed = (data: any) => {
      const TIER_LABEL: Record<string, string> = {
        bronze: '🥉 Đồng', silver: '🥈 Bạc', gold: '🥇 Vàng', platinum: '💎 Kim Cương',
      }
      addNotification({
        type: 'payment_confirmed',
        title: '✅ Thanh toán thành công',
        message: `Mã vé ${data.bookingCode} đã được xác nhận. +${data.pointsEarned} điểm`,
        meta: data,
      })

      const lastTier = localStorage.getItem('popcorn_last_tier') || 'bronze'
      const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']
      const newTier = data.newLoyaltyTier || 'bronze'
      if (TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(lastTier)) {
        localStorage.setItem('popcorn_last_tier', newTier)
        addNotification({
          type: 'tier_upgrade',
          title: `🎉 Nâng hạng ${TIER_LABEL[newTier]}!`,
          message: `Chúc mừng! Bạn đã đạt hạng ${TIER_LABEL[newTier]} với ${data.newLoyaltyPoints} điểm`,
          meta: { tier: newTier, points: data.newLoyaltyPoints },
        })
      }
    }

    const handlePaymentRejected = (data: any) => {
      addNotification({
        type: 'payment_rejected',
        title: '❌ Thanh toán bị từ chối',
        message: data.reason || 'Giao dịch không được xác nhận',
        meta: data,
      })
    }

    const onConfirmed = (e: any) => handlePaymentConfirmed(e.detail)
    const onRejected = (e: any) => handlePaymentRejected(e.detail)
    window.addEventListener('socket:payment:confirmed', onConfirmed)
    window.addEventListener('socket:payment:rejected', onRejected)

    return () => {
      window.removeEventListener('socket:payment:confirmed', onConfirmed)
      window.removeEventListener('socket:payment:rejected', onRejected)
    }
  }, [user])

  const markAllRead = useCallback(() => {
    _notifications = _notifications.map(n => ({ ...n, read: true }))
    saveToStorage(_notifications)
    notify(_listeners, _notifications)
  }, [])

  const markRead = useCallback((id: string) => {
    _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n)
    saveToStorage(_notifications)
    notify(_listeners, _notifications)
  }, [])

  const clearAll = useCallback(() => {
    _notifications = []
    saveToStorage([])
    notify(_listeners, [])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllRead, markRead, clearAll }
}