import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Film, Calendar, Building2, Zap,
  Users, BarChart3, CreditCard, QrCode, ShoppingCart,
  ChevronLeft, ChevronRight, LogOut, Menu, X, Globe, FileText, Tag
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Logo from '../ui/Logo'
import toast from 'react-hot-toast'

const ADMIN_NAV = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    label: 'Quản lý nội dung',
    items: [
      { href: '/admin/movies',         label: 'Phim',           icon: Film },
      { href: '/admin/showtimes',      label: 'Suất chiếu',     icon: Calendar },
      { href: '/admin/rooms',          label: 'Phòng chiếu',    icon: Building2 },
      { href: '/admin/smart-schedule', label: 'Smart Schedule', icon: Zap },
    ]
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/admin/payments', label: 'Xác nhận CK', icon: CreditCard },
      { href: '/staff/checkin',  label: 'Check-in',    icon: QrCode },
      { href: '/staff/counter',  label: 'Bán vé quầy', icon: ShoppingCart },
    ]
  },
  {
    label: 'Người dùng & Báo cáo',
    items: [
      { href: '/admin/users',    label: 'Người dùng', icon: Users },
      { href: '/promotions', label: 'Khuyến mãi', icon: Tag },
      { href: '/admin/invoices', label: 'Hóa đơn',    icon: FileText },
      { href: '/admin/reports',  label: 'Báo cáo',    icon: BarChart3 },
    ]
  },
]

const STAFF_NAV = [
  {
    label: 'Vận hành',
    items: [
      { href: '/staff/counter',  label: 'Bán vé quầy', icon: ShoppingCart },
      { href: '/staff/checkin',  label: 'Check-in QR', icon: QrCode },
      { href: '/admin/payments', label: 'Xác nhận CK', icon: CreditCard },
    ]
  },
  {
    label: 'Báo cáo',
    items: [
      { href: '/admin',          label: 'Doanh thu',   icon: BarChart3, exact: true },
      { href: '/admin/invoices', label: 'Hóa đơn',     icon: FileText },
    ]
  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff'
  const NAV_GROUPS = isAdmin ? ADMIN_NAV : STAFF_NAV

  const handleLogout = () => { logout(); navigate('/'); toast.success('Đã đăng xuất') }

  const isActive = (href: string, exact = false) =>
    exact ? location.pathname === href : location.pathname === href || location.pathname.startsWith(href + '/')

  const W = collapsed ? 60 : 224

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-glass-border)' }}>
        <Logo size={collapsed ? 'sm' : 'md'} showText={false} to={isAdmin ? '/admin' : '/staff/counter'} />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-display font-bold text-sm truncate" style={{ color: 'var(--color-primary)' }}>Popcorn Cinema</span>
            <span className="text-xs" style={{ color: isAdmin ? 'rgba(253,230,138,0.7)' : 'rgba(52,211,153,0.7)' }}>
              {isAdmin ? '⚙️ Admin Panel' : '👩‍💼 Staff Panel'}
            </span>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" style={{ scrollbarWidth: 'none' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2 mb-1 text-xs font-bold uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.45)' }}>
                {group.label}
              </div>
            )}
            {collapsed && <div className="my-1 mx-2 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact)
                return (
                  <Link key={href} to={href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className="flex items-center gap-3 rounded-xl transition-all relative overflow-hidden"
                    style={{
                      padding: collapsed ? '10px 16px' : '9px 12px',
                      background: active ? 'rgba(168,85,247,0.18)' : 'transparent',
                      color: active ? '#C084FC' : 'rgba(255,255,255,0.75)',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}>
                    {active && !collapsed && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                        style={{ background: 'var(--color-primary)' }} />
                    )}
                    <Icon className="w-4 h-4 flex-shrink-0"
                      style={{ color: active ? '#C084FC' : 'rgba(255,255,255,0.55)' }} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t p-2 space-y-0.5"
        style={{ borderColor: 'var(--color-glass-border)' }}>
        <Link to="/" onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-all"
          style={{ color: 'rgba(255,255,255,0.65)', justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Xem web' : undefined}>
          <Globe className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Xem trang web</span>}
        </Link>

        <button onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-all"
          style={{ color: 'rgba(248,113,113,0.7)', justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Đăng xuất' : undefined}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Đăng xuất</span>}
        </button>

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl mt-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.95)' }}>{user?.name}</div>
              <span className="inline-block text-xs px-1.5 py-0.5 rounded-full font-semibold mt-0.5"
                style={{
                  background: isAdmin ? 'rgba(244,63,94,0.12)' : 'rgba(52,211,153,0.15)',
                  color: isAdmin ? '#F43F5E' : '#34D399',
                }}>
                {isAdmin ? 'Admin' : 'Nhân viên'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>

      {/* ── Desktop sidebar (fixed) ── */}
      <motion.aside
        animate={{ width: W }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        className="hidden md:flex flex-col flex-shrink-0 relative z-30"
        style={{
          width: W,
          background: 'rgba(9,13,24,0.99)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
        <SidebarInner />

        {/* Collapse btn */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-[52px] -right-3 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg"
          style={{ background: '#0E1420', border: '1px solid rgba(168,85,247,0.4)', color: 'var(--color-primary)' }}>
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.65)' }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 z-50 md:hidden flex flex-col"
              style={{ width: 240, background: 'rgba(9,13,24,1)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <SidebarInner />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-12 border-b flex-shrink-0"
          style={{ background: 'rgba(9,13,24,0.98)', borderColor: 'var(--color-glass-border)' }}>
          <button onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
            <Menu className="w-4 h-4" />
          </button>
          <Logo size="sm" showText={false} to={isAdmin ? '/admin' : '/staff/counter'} />
          <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>Popcorn {isAdmin ? 'Admin' : 'Staff'}</span>
        </div>

        {/* Page content — scrollable, always dark */}
        <div className="flex-1 overflow-y-auto"
          style={{
            background: '#0B0911',
            color: '#F0EEFF',
            '--color-bg': '#0B0911',
            '--color-bg-2': '#110F1A',
            '--color-bg-3': '#1A1726',
            '--color-bg-4': '#221E31',
            '--color-text': '#F0EEFF',
            '--color-text-muted': '#C4B5FD',
            '--color-text-dim': '#8B7FC8',
            '--color-glass-border': 'rgba(168,85,247,0.2)',
          } as any}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}