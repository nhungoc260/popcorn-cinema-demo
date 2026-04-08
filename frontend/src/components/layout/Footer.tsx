import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'
import { MapPin, Phone, Mail } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer className="mt-20 border-t"
      style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-2)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* ── Brand ── */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo size="lg" to="/" />
            </div>
            <p className="text-sm leading-relaxed mb-5 max-w-sm"
              style={{ color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
              Trải nghiệm xem phim đẳng cấp – Đặt vé dễ dàng, nhanh chóng.
              Hệ thống rạp chiếu phim hiện đại nhất Việt Nam.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              {[
                { label: 'f', href: '#', bg: '#1877F2' },
                { label: '📸', href: '#', bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
                { label: '▶', href: '#', bg: '#FF0000' },
              ].map(({ label, href, bg }) => (
                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.12, y: -2 }} whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all"
                  style={{ background: bg, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {label}
                </motion.a>
              ))}
            </div>
          </div>

          {/* ── Khám Phá ── */}
          <div>
            <h4 className="font-bold text-sm mb-4" style={{ color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
              Khám Phá
            </h4>
            <ul className="space-y-3">
              {[
                { to: '/movies?status=now_showing', label: 'Phim Đang Chiếu' },
                { to: '/movies?status=coming_soon', label: 'Phim Sắp Chiếu' },
                { to: '/showtimes', label: 'Đặt Vé' },
                { to: '/theaters', label: 'Hệ Thống Rạp' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}
                    className="text-sm transition-all hover:translate-x-1 inline-block"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Liên Hệ ── */}
          <div>
            <h4 className="font-bold text-sm mb-4" style={{ color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
              Liên Hệ
            </h4>
            <ul className="space-y-3">
              {[
                { icon: MapPin, text: '123 Nguyễn Huệ, Q.1, TP.HCM' },
                { icon: Phone, text: '0765099748' },
                { icon: Mail, text: 'hoidap@popcorn.vn' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm"
                  style={{ color: 'var(--color-text-muted)' }}>
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-glass-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            © 2026 Popcorn Cinema. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['Điều Khoản', 'Bảo Mật', 'Cookies'].map(t => (
              <a key={t} href="#"
                className="text-xs transition-colors"
                style={{ color: 'var(--color-text-dim)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
