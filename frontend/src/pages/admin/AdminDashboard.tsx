import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Film, Ticket, DollarSign, TrendingUp } from 'lucide-react'
import { adminApi } from '../../api'
import { useAuthStore } from '../../store/authStore'

const fmtPrice = (n: number) =>
  n >= 1e9 ? `${(n/1e9).toFixed(1)}B đ`
  : n >= 1e6 ? `${(n/1e6).toFixed(1)}M đ`
  : `${n.toLocaleString('vi-VN')} đ`

const fmtM = (n: number) =>
  n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : `${n}`

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
    select: d => d.data.data,
    refetchInterval: 30000,
  })
  const stats = data as any

  const { data: revData } = useQuery({
    queryKey: ['revenue-7d'],
    queryFn: async () => {
      const { default: api } = await import('../../api')
      return api.get('/reports/revenue?period=day')
    },
    select: d => (d as any)?.data?.data,
  })

  // Fill đủ 7 ngày gần nhất theo local time (tránh lệch UTC vs VN +07:00)
  const toLocalKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const revenue: any[] = (() => {
    const raw: any[] = (revData as any)?.revenue || []
    const rawMap: Record<string, any> = {}
    raw.forEach(r => { rawMap[r._id] = r })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = toLocalKey(d)
      return rawMap[key] || { _id: key, total: 0, count: 0 }
    })
  })()
  const hasData = revenue.some(r => r.total > 0 || r.count > 0)
  const maxRev = Math.max(...revenue.map((r: any) => r.total), 1)

  const STAT_CARDS = [
    { label: 'Tổng doanh thu', value: fmtPrice(stats?.revenue ?? 0),    icon: DollarSign, color: '#22C55E',  bg: 'rgba(34,197,94,0.1)',   delta: '', href: '/admin/reports' },
    { label: 'Vé đã bán',      value: stats?.totalBookings ?? '—',       icon: Ticket,     color: 'var(--color-primary)',  bg: 'rgba(168,85,247,0.1)',  delta: stats?.todayBookings ? `+${stats.todayBookings} hôm nay` : '', href: '/admin/payments' },
    { label: 'Người dùng',     value: stats?.totalUsers ?? '—',          icon: Users,      color: '#F472B6',  bg: 'rgba(244,114,182,0.1)', delta: '', href: '/admin/users' },
    { label: 'Tỉ lệ lấp đầy', value: stats?.occupancyRate != null ? `${stats.occupancyRate}%` : '—', icon: TrendingUp, color: '#F97316', bg: 'rgba(249,115,22,0.1)', delta: '', href: '/admin/reports' },
  ]

  const statusCfg: Record<string, { label: string; color: string }> = {
    confirmed:       { label: 'Đã xác nhận',  color: 'var(--color-primary)' },
    checked_in:      { label: 'Đã check-in',  color: '#34D399' },
    pending:         { label: 'Chờ thanh toán', color: '#FDE68A' },
    cancelled:       { label: 'Đã hủy',        color: '#F87171' },
    pending_payment: { label: 'Chờ CK',         color: '#F97316' },
  }

  return (
    <div className="p-6 space-y-6">

      {/* Page title */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--color-text)' }}>
              {user?.role === 'staff' ? '👩‍💼 Trang chủ Nhân Viên' : '⚙️ Trang chủ Admin'}
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                background: user?.role === 'admin' ? 'rgba(253,230,138,0.15)' : 'rgba(52,211,153,0.15)',
                color: user?.role === 'admin' ? '#FDE68A' : '#34D399',
                border: `1px solid ${user?.role === 'admin' ? 'rgba(253,230,138,0.3)' : 'rgba(52,211,153,0.3)'}`,
              }}>
              {user?.role === 'admin' ? 'Admin' : 'Nhân viên'}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Xin chào, <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{user?.name}</span>
            {user?.role === 'staff'
              ? ' · Bán vé, check-in và xác nhận thanh toán'
              : ' · Tổng quan hiệu suất hệ thống rạp chiếu phim'}
          </p>
        </div>
      </div>

      {/* Staff: show quick actions prominently */}
      {user?.role === 'staff' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: '/staff/counter',  emoji: '🎫', label: 'Bán Vé Tại Quầy',    desc: 'Chọn ghế và thanh toán trực tiếp', color: 'var(--color-primary)', bg: 'rgba(168,85,247,0.08)' },
            { href: '/staff/checkin',  emoji: '📷', label: 'Check-in QR',         desc: 'Quét mã QR vé của khách',           color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
            { href: '/admin/payments', emoji: '💰', label: 'Xác Nhận Chuyển Khoản', desc: 'Duyệt các lệnh CK đang chờ',     color: '#FDE68A', bg: 'rgba(253,230,138,0.08)' },
            { href: '/admin/invoices', emoji: '🧾', label: 'Quản Lý Hóa Đơn',    desc: 'Tra cứu tất cả giao dịch',          color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
          ].map(({ href, emoji, label, desc, color, bg }) => (
            <a key={href} href={href}
              className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:scale-[1.02]"
              style={{ background: bg, border: `1.5px solid ${color}30` }}>
              <div className="text-4xl flex-shrink-0">{emoji}</div>
              <div>
                <div className="font-bold text-sm" style={{ color }}>{label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, delta, href }, i) => (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="p-5 rounded-2xl"
            onClick={() => href && navigate(href)}
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', cursor: href ? 'pointer' : 'default', transition: 'all 0.2s' }}
            whileHover={href ? { scale: 1.02, borderColor: color } : {}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            {isLoading
              ? <div className="h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              : (
                <>
                  <div className="font-black text-2xl" style={{ color }}>{value}</div>
                  {delta && <div className="text-xs mt-1 font-medium" style={{ color: '#34D399' }}>↑ {delta}</div>}
                </>
              )
            }
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Revenue bar chart — 7 ngày qua */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Doanh thu 7 ngày qua</h3>
              {revenue.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>
                  {fmtPrice(revenue.reduce((s, r) => s + r.total, 0))}
                </p>
              )}
            </div>
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          </div>

          {!hasData ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <div className="flex items-end gap-1.5" style={{ height: 128 }}>
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-lg animate-pulse"
                    style={{ height: `${h}%`, background: `rgba(34,211,238,${0.15 + i * 0.05})` }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="relative flex items-end gap-1.5" style={{ height: 160 }}>
              {revenue.map((r: any, i: number) => {
                const px = Math.max((r.total / maxRev) * 160, r.total > 0 ? 4 : 0)
                const isMax = r.total === maxRev
                return (
                  <div key={i} className="flex-1 group relative cursor-default" style={{ height: 160 }}>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'var(--color-bg)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)' }}>
                      {fmtM(r.total)}đ
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: px }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="w-full rounded-t-lg absolute bottom-0"
                      style={{
                        background: isMax
                          ? 'linear-gradient(180deg,var(--color-primary),var(--color-primary-dark))'
                          : 'linear-gradient(180deg,rgba(168,85,247,0.55),rgba(8,145,178,0.35))',
                        boxShadow: isMax ? '0 0 10px rgba(168,85,247,0.4)' : 'none',
                      }} />
                  </div>
                )
              })}
            </div>
          )}
          {hasData && (
            <div className="flex justify-between mt-2">
              {revenue.map((r: any, i: number) => (
                <div key={i} className="flex-1 text-center text-xs" style={{ color: 'var(--color-text-dim)', fontSize: 10 }}>
                  {r._id?.slice(5)}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Vé bán ra 7 ngày */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="p-5 rounded-2xl"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Vé bán ra 7 ngày qua</h3>
              {hasData && (
                <p className="text-xs mt-0.5" style={{ color: '#34D399' }}>
                  {revenue.reduce((s: number, r: any) => s + r.count, 0)} giao dịch
                </p>
              )}
            </div>
            <Ticket className="w-4 h-4" style={{ color: '#34D399' }} />
          </div>
          {!hasData ? (
            <div className="flex items-end gap-1.5" style={{ height: 160 }}>
              {[30, 50, 40, 70, 45, 85, 60].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-lg animate-pulse"
                  style={{ height: `${h}%`, background: `rgba(52,211,153,${0.15 + i * 0.05})` }} />
              ))}
            </div>
          ) : (
            <div className="relative flex items-end gap-1.5" style={{ height: 160 }}>
              {(() => {
                const maxC = Math.max(...revenue.map((x: any) => x.count), 1)
                return revenue.map((r: any, i: number) => {
                  const px = Math.max((r.count / maxC) * 160, r.count > 0 ? 4 : 0)
                  return (
                    <div key={i} className="flex-1 group relative cursor-default" style={{ height: 160 }}>
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'var(--color-bg)', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399' }}>
                        {r.count} vé
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: px }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="w-full rounded-t-lg absolute bottom-0"
                        style={{ background: 'linear-gradient(180deg,rgba(52,211,153,0.7),rgba(16,185,129,0.4))' }} />
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom row: top movies + recent bookings */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Top phim bán chạy */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-2 p-5 rounded-2xl"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--color-text)' }}>🎬 Top phim bán chạy nhất</h3>
          {!(revData as any)?.topMovies?.length ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {(revData as any).topMovies.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: i === 0 ? 'rgba(253,230,138,0.2)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#FDE68A' : 'var(--color-text-dim)' }}>
                    {i + 1}
                  </div>
                  {m.poster && <img src={m.poster} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                    <div className="mt-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${((m.revenue / ((revData as any).topMovies[0]?.revenue || 1)) * 100)}%`,
                        background: 'linear-gradient(90deg,var(--color-primary),#FDE68A)'
                      }} />
                    </div>
                  </div>
                  <div className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-primary)' }}>{fmtM(m.revenue)}đ</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Hoạt động gần đây */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="lg:col-span-3 p-5 rounded-2xl"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--color-text)' }}>⚡ Hoạt động gần đây</h3>
          {!stats?.recentBookings?.length ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>Chưa có hoạt động</p>
          ) : (
            <div className="space-y-2">
              {stats.recentBookings.slice(0, 7).map((b: any) => {
                const cfg = statusCfg[b.status] || { label: b.status, color: '#888' }
                return (
                  <div key={b._id} className="flex items-center gap-3 py-1.5">
                    {b.showtime?.movie?.poster && (
                      <img src={b.showtime.movie.poster} alt="" className="w-7 h-10 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {b.user?.name}
                        <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>
                          đã đặt {b.showtime?.movie?.title}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-text-dim)' }}>
                        {b.bookingCode} · {b.seatLabels?.join(', ')}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: '#FDE68A' }}>
                        {(b.paidAmount ?? b.totalAmount)?.toLocaleString('vi')}đ
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${cfg.color}18`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Payment method breakdown */}
      {stats?.paymentByMethod?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="grid sm:grid-cols-4 gap-3">
          {stats.paymentByMethod.map((pm: any) => {
            const cfg: Record<string, { icon: string; label: string; color: string }> = {
              momo:   { icon: '📱', label: 'MoMo',         color: '#AE2070' },
              vietqr: { icon: '🏦', label: 'VietQR',       color: 'var(--color-primary)' },
              bank:   { icon: '💳', label: 'Chuyển khoản', color: '#FDE68A' },
              cash:   { icon: '💵', label: 'Tiền mặt',     color: '#34D399' },
            }
            const c = cfg[pm._id] || { icon: '💰', label: pm._id, color: '#888' }
            return (
              <div key={pm._id} className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <div className="font-semibold text-sm" style={{ color: c.color }}>{c.label}</div>
                  <div className="font-black" style={{ color: 'var(--color-text)' }}>{fmtPrice(pm.total)}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{pm.count} GD</div>
                </div>
              </div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}