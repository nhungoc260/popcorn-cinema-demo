// src/components/ui/TierUpgradeModal.tsx
// Popup chúc mừng nâng hạng thẻ thành viên
// Dùng: <TierUpgradeModal tier="gold" onClose={() => ...} />

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star } from 'lucide-react'

const TIER_CONFIG = {
  bronze: {
    label: 'Đồng',
    icon: '🥉',
    color: '#CD7F32',
    glow: 'rgba(205,127,50,0.4)',
    gradient: 'linear-gradient(135deg,#CD7F32,#A0522D)',
    bg: 'rgba(205,127,50,0.08)',
    perks: ['Tích điểm mỗi lần đặt vé', 'Ưu đãi sinh nhật'],
  },
  silver: {
    label: 'Bạc',
    icon: '🥈',
    color: '#C0C0C0',
    glow: 'rgba(192,192,192,0.4)',
    gradient: 'linear-gradient(135deg,#C0C0C0,#808080)',
    bg: 'rgba(192,192,192,0.08)',
    perks: ['Giảm 5% mỗi vé', 'Ưu tiên chọn ghế', 'Ưu đãi sinh nhật'],
  },
  gold: {
    label: 'Vàng',
    icon: '🥇',
    color: '#FFD700',
    glow: 'rgba(255,215,0,0.4)',
    gradient: 'linear-gradient(135deg,#FFD700,#FFA500)',
    bg: 'rgba(255,215,0,0.08)',
    perks: ['Giảm 8% mỗi vé', 'Ưu tiên chọn ghế', '1 vé miễn phí/tháng', 'Ưu đãi sinh nhật'],
  },
  platinum: {
    label: 'Kim Cương',
    icon: '💎',
    color: '#A855F7',
    glow: 'rgba(168,85,247,0.5)',
    gradient: 'linear-gradient(135deg,#A855F7,#7C3AED)',
    bg: 'rgba(168,85,247,0.08)',
    perks: ['Giảm 10% mỗi vé', 'Ghế VIP ưu tiên', '2 vé miễn phí/tháng', 'Phòng chờ VIP', 'Ưu đãi sinh nhật'],
  },
}

interface Props {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  onClose: () => void
}

export default function TierUpgradeModal({ tier, points, onClose }: Props) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze

  // Bắn confetti khi mở
  useEffect(() => {
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;overflow:hidden'
    const colors = [cfg.color, '#FDE68A', '#A78BFA', '#F472B6', '#34D399']
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div')
      const size = 5 + Math.random() * 9
      el.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;
        background:${colors[i % colors.length]};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        left:${Math.random() * 100}%;top:-20px;opacity:0.95;
        animation:tier-confetti ${2.5 + Math.random() * 2}s ease-in ${Math.random() * 1.2}s forwards;
      `
      container.appendChild(el)
    }
    const style = document.createElement('style')
    style.textContent = `@keyframes tier-confetti { to { transform: translateY(110vh) rotate(${720}deg); opacity:0; } }`
    document.head.appendChild(style)
    document.body.appendChild(container)
    const t = setTimeout(() => {
      try { document.body.removeChild(container); document.head.removeChild(style) } catch {}
    }, 5000)
    return () => { clearTimeout(t); try { document.body.removeChild(container); document.head.removeChild(style) } catch {} }
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
          style={{
            background: 'var(--color-bg-2)',
            border: `1px solid ${cfg.color}40`,
            boxShadow: `0 0 60px ${cfg.glow}, 0 30px 80px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg z-10"
            style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-3)' }}
          >
            <X size={16} />
          </button>

          {/* Top glow bar */}
          <div className="h-1.5 w-full" style={{ background: cfg.gradient }} />

          {/* Content */}
          <div className="px-8 pt-8 pb-6">
            {/* Animated badge */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] }}
              transition={{ duration: 1.2, repeat: 2, ease: 'easeInOut' }}
              className="text-7xl mb-4 select-none"
            >
              {cfg.icon}
            </motion.div>

            <p className="text-xs font-semibold mb-1 tracking-widest uppercase"
              style={{ color: cfg.color }}>
              Chúc Mừng!
            </p>
            <h2 className="font-bold text-2xl mb-1" style={{ color: 'var(--color-text)' }}>
              Bạn Đã Lên Hạng
            </h2>
            <h3 className="font-black text-3xl mb-1" style={{
              background: cfg.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {cfg.label}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              {points.toLocaleString('vi-VN')} điểm tích lũy
            </p>

            {/* Divider */}
            <div className="h-px w-full mb-5" style={{ background: `${cfg.color}25` }} />

            {/* Perks */}
            <div className="text-left mb-6">
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)' }}>
                <Star size={12} style={{ color: cfg.color }} />
                Quyền lợi của bạn
              </p>
              <div className="space-y-2">
                {cfg.perks.map(perk => (
                  <div key={perk} className="flex items-center gap-2.5 text-sm"
                    style={{ color: 'var(--color-text)' }}>
                    <span style={{ color: cfg.color }}>✓</span>
                    {perk}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="w-full py-3.5 rounded-xl font-bold text-sm"
              style={{
                background: cfg.gradient,
                color: 'white',
                boxShadow: `0 4px 20px ${cfg.glow}`,
              }}
            >
              Tuyệt vời! 🎉
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}