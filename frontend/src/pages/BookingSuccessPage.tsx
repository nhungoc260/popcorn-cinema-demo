// src/pages/BookingSuccessPage.tsx
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, Ticket, CheckCircle } from 'lucide-react'
import { bookingApi } from '../api'
import api from '../api'
import { useEffect, useState } from 'react'
import TierUpgradeModal from '../components/ui/TierUpgradeModal'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

// Key lưu tier cũ vào localStorage để so sánh
const TIER_KEY = 'popcorn_last_tier'

export default function BookingSuccessPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [tierUpgrade, setTierUpgrade] = useState<{ tier: string; points: number } | null>(null)

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getOne(bookingId!),
    select: d => d.data.data,
    refetchInterval: (data: any) => {
      const status = data?.status
      if (status === 'confirmed' || status === 'checked_in' || status === 'cancelled') return false
      return 1000
    },
  })

  // Lấy loyalty hiện tại để so sánh với tier cũ
  const { data: loyalty } = useQuery({
    queryKey: ['loyalty-success', bookingId],
    queryFn: () => api.get('/coupons/loyalty'),
    select: d => d.data.data,
    enabled: !!(booking as any)?._id,
  })

  const b = booking as any

  // Check nâng hạng: so sánh tier hiện tại vs tier đã lưu
  useEffect(() => {
    if (!loyalty || !b) return
    // Chỉ check khi booking đã confirmed
    if (b.status !== 'confirmed' && b.status !== 'checked_in') return

    const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']
    const lastTier = localStorage.getItem(TIER_KEY) || 'bronze'
    const currentTier = loyalty.tier || 'bronze'

    const lastIdx = TIER_ORDER.indexOf(lastTier)
    const currentIdx = TIER_ORDER.indexOf(currentTier)

    if (currentIdx > lastIdx) {
      // Đã nâng hạng! Lưu tier mới và show modal
      localStorage.setItem(TIER_KEY, currentTier)
      // Delay nhỏ để confetti booking không đụng confetti nâng hạng
      setTimeout(() => {
        setTierUpgrade({ tier: currentTier, points: loyalty.points || 0 })
      }, 2000)
    } else {
      // Cập nhật tier hiện tại nếu chưa lưu
      if (!localStorage.getItem(TIER_KEY)) {
        localStorage.setItem(TIER_KEY, currentTier)
      }
    }
  }, [loyalty, b])

  // Confetti khi confirmed
  useEffect(() => {
    if (b?.status !== 'confirmed' && b?.status !== 'checked_in') return
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden'
    const colors = ['var(--color-primary)', '#FDE68A', '#F472B6', '#A78BFA', 'var(--color-primary-light)']
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div')
      const color = colors[i % colors.length]
      const size = 6 + Math.random() * 8
      el.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;
        background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        left:${Math.random() * 100}%;top:-20px;opacity:0.9;
        animation:confetti-fall ${2 + Math.random() * 2}s ease-in ${Math.random() * 1.5}s forwards;
      `
      container.appendChild(el)
    }
    const style = document.createElement('style')
    style.textContent = `@keyframes confetti-fall { to { transform: translateY(110vh) rotate(${Math.random() > 0.5 ? '' : '-'}${360 + Math.random() * 360}deg); opacity: 0; } }`
    document.head.appendChild(style)
    document.body.appendChild(container)
    const timer = setTimeout(() => {
      document.body.removeChild(container)
      document.head.removeChild(style)
    }, 4500)
    return () => { clearTimeout(timer); try { document.body.removeChild(container); document.head.removeChild(style) } catch {} }
  }, [b?.status])

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        {/* Success animation */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(168,85,247,0.15)', border: '2px solid rgba(168,85,247,0.4)', boxShadow: '0 0 40px rgba(168,85,247,0.3)' }}>
            {b?.status === 'confirmed' || b?.status === 'checked_in'
              ? <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
              : b?.status === 'cancelled' ? <span className="text-4xl">❌</span>
              : <span className="text-4xl">⏳</span>}
          </div>
          <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--color-text)' }}>
            {b?.status === 'confirmed' || b?.status === 'checked_in' ? 'Đặt Vé Thành Công! 🎬' :
             b?.status === 'pending' ? 'Chờ Thanh Toán ⏳' :
             b?.status === 'pending_payment' ? 'Chờ Xác Nhận 🔄' :
             b?.status === 'cancelled' ? 'Vé Đã Hủy ❌' :
             b?.status === 'refunded' ? 'Vé Đã Hoàn Tiền 💸' : 'Chi Tiết Vé 🎫'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {b?.status === 'confirmed' || b?.status === 'checked_in' ? 'Vé của bạn đã được xác nhận. Chúc xem phim vui!' :
             b?.status === 'pending' ? 'Vé chưa được thanh toán.' :
             b?.status === 'pending_payment' ? 'Đang chờ admin/nhân viên xác nhận chuyển khoản.' :
             b?.status === 'cancelled' ? 'Vé này đã bị hủy.' :
             b?.status === 'refunded' ? 'Vé đã được hoàn tiền và không còn hiệu lực.' : ''}
          </p>
          {/* Banner cảnh báo cho vé không hợp lệ */}
          {(b?.status === 'cancelled' || b?.status === 'refunded') && (
            <div className="mt-3 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>
              ⚠️ Vé này không thể sử dụng để vào rạp
            </div>
          )}
        </motion.div>

        {/* Ticket */}
        {b && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="rounded-3xl overflow-hidden"
              style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              {/* Ticket header */}
              <div className="p-6 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(8,145,178,0.1))' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>🎬 POPCORN CINEMA</div>
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>
                  {b.showtime?.movie?.title}
                </h2>
              </div>

              {/* Dashed divider */}
              <div className="relative py-3 px-6 flex items-center">
                <div className="flex-1 border-dashed border-t" style={{ borderColor: 'var(--color-glass-border)' }} />
                <Ticket className="w-5 h-5 mx-3" style={{ color: 'var(--color-text-dim)' }} />
                <div className="flex-1 border-dashed border-t" style={{ borderColor: 'var(--color-glass-border)' }} />
              </div>

              {/* Ticket details */}
              <div className="px-6 pb-4 space-y-3">
                {[
                  { icon: Calendar, label: 'Ngày chiếu', value: b.showtime?.startTime ? fmtDate(b.showtime.startTime) : '—' },
                  { icon: Clock, label: 'Giờ chiếu', value: b.showtime?.startTime ? fmtTime(b.showtime.startTime) : '—' },
                  { icon: MapPin, label: 'Rạp', value: b.showtime?.theater?.name || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{value}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ghế ngồi</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                    {b.seatLabels?.join(', ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mã đặt vé</span>
                  <span className="font-mono text-sm font-bold" style={{ color: '#FDE68A' }}>{b.bookingCode}</span>
                </div>
              </div>

              {/* QR Code section — CHỈ hiện khi vé đã xác nhận */}
              {b.qrCode && (b.status === 'confirmed' || b.status === 'checked_in') && (
                <>
                  <div className="relative py-3 px-6 flex items-center">
                    <div className="flex-1 border-dashed border-t" style={{ borderColor: 'var(--color-glass-border)' }} />
                    <span className="text-xs mx-3" style={{ color: 'var(--color-text-dim)' }}>QUÉT VÀO RẠP</span>
                    <div className="flex-1 border-dashed border-t" style={{ borderColor: 'var(--color-glass-border)' }} />
                  </div>
                  <div className="flex justify-center pb-6">
                    <div className="p-3 rounded-2xl" style={{ background: 'white' }}>
                      <img src={b.qrCode} alt="QR Code" className="w-32 h-32" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4 flex-wrap">
              <button onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)', minWidth: 100 }}>
                🖨️ In Vé
              </button>
              <Link to="/my-bookings"
                className="flex-1 py-3 rounded-xl text-sm font-medium text-center transition-all"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)', minWidth: 100 }}>
                📋 Vé Của Tôi
              </Link>
              <Link to="/movies"
                className="flex-1 py-3 rounded-xl text-sm font-bold text-center"
                style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', minWidth: 100 }}>
                🎬 Đặt Thêm
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tier upgrade modal */}
      {tierUpgrade && (
        <TierUpgradeModal
          tier={tierUpgrade.tier as any}
          points={tierUpgrade.points}
          onClose={() => setTierUpgrade(null)}
        />
      )}
    </div>
  )
}