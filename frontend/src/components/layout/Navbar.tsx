// src/components/layout/Navbar.tsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Menu, X, LayoutDashboard, QrCode, Sun, Moon, ChevronDown, Ticket, Film, Heart, Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Logo from '../ui/Logo'
import { useThemeStore } from '../../store/themeStore'
import { authApi } from '../../api'
import toast from 'react-hot-toast'
import { useNotifications } from '../../hooks/useNotifications'
import TierUpgradeModal from '../ui/TierUpgradeModal'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [tierUpgrade, setTierUpgrade] = useState<{ tier: string; points: number } | null>(null)
  const { user, token, refresh, logout } = useAuthStore()
  const { mode, toggleMode } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isDark = mode === 'dark'
  const notiRef = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Lắng nghe thông báo nâng hạng mới → show popup
  useEffect(() => {
    const latest = notifications.find(n => n.type === 'tier_upgrade' && !n.read)
    if (latest) {
      setTierUpgrade({ tier: latest.meta?.tier, points: latest.meta?.points })
      markRead(latest.id)
    }
  }, [notifications])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setMenuOpen(false); setUserMenu(false); setNotiOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    try { if (refresh) await authApi.logout(refresh) } catch {}
    logout(); navigate('/'); toast.success('Đã đăng xuất')
  }

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const NAV_LINKS = [
    { href: '/',          label: 'Trang Chủ' },
    { href: '/movies',    label: 'Phim' },
    { href: '/theaters',  label: 'Rạp Chiếu' },
    { href: '/showtimes', label: 'Suất Chiếu' },
  ]

  const NOTI_ICONS: Record<string, string> = {
    tier_upgrade: '🎉',
    payment_confirmed: '✅',
    payment_rejected: '❌',
    booking_success: '🎬',
  }

  const handleNotiClick = (n: any) => {
    markRead(n.id)
    setNotiOpen(false)
    if (n.type === 'payment_confirmed' || n.type === 'booking_success' || n.type === 'payment_rejected') {
      navigate('/my-bookings')
    } else if (n.type === 'tier_upgrade') {
      navigate('/profile')
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={scrolled ? {
          background: isDark ? 'rgba(11,9,17,0.88)' : 'rgba(250,248,255,0.88)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--color-glass-border)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
        } : { background: 'transparent' }}>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Logo size="md" to="/" />

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link key={href} to={href}
                  className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {label}
                  {active && (
                    <motion.div layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl -z-10"
                      style={{ background: 'rgba(168,85,247,0.1)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                  )}
                </Link>
              )
            })}
          </div>

          {/* ── Right ── */}
          <div className="flex items-center gap-2">

            {/* Theme toggle */}
            <motion.button onClick={toggleMode}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(124,58,237,0.08)',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-primary)',
              }}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            {/* ── Chuông thông báo ── */}
            {token && user && (
              <div ref={notiRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { setNotiOpen(!notiOpen); setUserMenu(false); if (!notiOpen) markAllRead() }}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: notiOpen ? 'rgba(168,85,247,0.15)' : 'transparent',
                    border: '1px solid var(--color-glass-border)',
                    color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}>
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: '#F43F5E', color: 'white' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </motion.button>

                {/* Dropdown thông báo */}
                <AnimatePresence>
                  {notiOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden shadow-2xl"
                      style={{
                        background: isDark ? 'rgba(17,15,26,0.97)' : 'rgba(240,235,255,0.97)',
                        border: '1px solid var(--color-glass-border)',
                        backdropFilter: 'blur(20px)',
                        maxHeight: '420px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}>

                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                        style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                          Thông báo
                        </span>
                        {notifications.length > 0 && (
                          <button onClick={clearAll}
                            className="text-xs transition-colors"
                            style={{ color: 'var(--color-text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                            Xoá tất cả
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="text-center py-10">
                            <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                              Chưa có thông báo
                            </p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id}
                              onClick={() => handleNotiClick(n)}
                              className="flex gap-3 px-4 py-3 transition-colors cursor-pointer"
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'rgba(168,85,247,0.06)' : 'transparent'}
                              style={{
                                background: !n.read ? 'rgba(168,85,247,0.06)' : 'transparent',
                                borderBottom: '1px solid var(--color-glass-border)',
                              }}>
                              <span className="text-xl flex-shrink-0 mt-0.5">{NOTI_ICONS[n.type] || '📣'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
                                  {n.title}
                                </p>
                                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                  {n.message}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                                  {n.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  {' · '}
                                  {n.createdAt.toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                              {!n.read && (
                                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                                  style={{ background: 'var(--color-primary)' }} />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-2.5 flex-shrink-0"
                          style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                          <Link to="/my-bookings"
                            onClick={() => setNotiOpen(false)}
                            className="text-xs font-medium"
                            style={{ color: 'var(--color-primary)' }}>
                            Xem tất cả vé →
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {token && user ? (
              <div className="relative">
                <motion.button onClick={() => { setUserMenu(!userMenu); setNotiOpen(false) }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                  style={{
                    background: userMenu ? 'rgba(168,85,247,0.12)' : 'transparent',
                    border: '1px solid var(--color-glass-border)',
                  }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white' }}>
                    {user.avatar
                      ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      : user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--color-text)' }}>
                    {user.name?.split(' ').pop()}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform"
                    style={{ color: 'var(--color-text-muted)', transform: userMenu ? 'rotate(180deg)' : 'none' }} />
                </motion.button>

                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden shadow-2xl py-1.5"
                      style={{
                        background: isDark ? 'rgba(17,15,26,0.97)' : 'rgba(240,235,255,0.97)',
                        border: '1px solid var(--color-glass-border)',
                        backdropFilter: 'blur(20px)',
                      }}>

                      {/* User info */}
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                        <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{user.name}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</div>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                          style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>
                          {user.role === 'admin' ? '⚙️ Admin' : user.role === 'staff' ? '🧑‍💼 Nhân viên' : '👤 Thành viên'}
                        </span>
                      </div>

                      <div className="py-1">
                        {user.role === 'admin' && (
                          <DItem icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Admin Dashboard" href="/admin" />
                        )}
                        {(user.role === 'staff' || user.role === 'admin') && <>
                          <DItem icon={<Ticket className="w-3.5 h-3.5" />} label="Bán vé quầy" href="/staff/counter" />
                          <DItem icon={<QrCode className="w-3.5 h-3.5" />} label="Check-in" href="/staff/checkin" />
                        </>}
                        <DItem icon={<Film className="w-3.5 h-3.5" />} label="Vé của tôi" href="/my-bookings" />
                        <DItem icon={<Heart className="w-3.5 h-3.5" />} label="Hồ sơ" href="/profile" />
                      </div>

                      <div className="border-t pt-1" style={{ borderColor: 'var(--color-glass-border)' }}>
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-red-500/8"
                          style={{ color: '#F43F5E' }}>
                          <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--color-text-muted)' }}>
                  Đăng nhập
                </Link>
                <Link to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.4)' }}>
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t overflow-hidden"
              style={{
                background: isDark ? 'rgba(11,9,17,0.97)' : 'rgba(250,248,255,0.97)',
                borderColor: 'var(--color-glass-border)',
              }}>
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link key={href} to={href}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium"
                    style={{
                      background: isActive(href) ? 'rgba(168,85,247,0.1)' : 'transparent',
                      color: isActive(href) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}>
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Tier upgrade popup ── */}
      {tierUpgrade && tierUpgrade.tier && (
        <TierUpgradeModal
          tier={tierUpgrade.tier as any}
          points={tierUpgrade.points}
          onClose={() => setTierUpgrade(null)}
        />
      )}
    </>
  )
}

function DItem({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link to={href}
      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.color = 'var(--color-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
      <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
      {label}
    </Link>
  )
}