import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Users, Ticket, DollarSign, BarChart3, Film, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../../api'

const fmtM = (n: number) => {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`
  return `${n}`
}
const fmtPrice = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const PERIODS = [
  { value: 'day', label: '30 Ngày' },
  { value: 'month', label: '12 Tháng' },
  { value: 'year', label: 'Theo Năm' },
]

// ── Xuất CSV đầy đủ ──────────────────────────────────────
function exportCSV(report: any, revenue: any[], period: string) {
  const periodLabel = period === 'day' ? '30 ngày' : period === 'month' ? '12 tháng' : 'theo năm'
  const dateStr = new Date().toLocaleDateString('vi-VN')
  const lines: string[] = []

  lines.push(`BÁO CÁO DOANH THU POPCORN CINEMA`)
  lines.push(`Kỳ báo cáo: ${periodLabel} | Xuất ngày: ${dateStr}`)
  lines.push(``)

  // Tổng quan
  lines.push(`=== TỔNG QUAN ===`)
  lines.push(`Tổng doanh thu,${report?.summary?.totalRevenue || 0}`)
  lines.push(`Tổng giao dịch,${report?.summary?.totalTransactions || 0}`)
  lines.push(`Người dùng mới tháng này,${report?.newUsersThisMonth || 0}`)
  lines.push(``)

  // Doanh thu theo thời gian
  lines.push(`=== DOANH THU THEO THỜI GIAN ===`)
  lines.push(`Thời gian,Doanh thu (VND),Số giao dịch`)
  revenue.forEach((r: any) => {
    lines.push(`${r._id},${r.total},${r.count}`)
  })
  lines.push(``)

  // Top phim
  if (report?.topMovies?.length) {
    lines.push(`=== TOP PHIM DOANH THU ===`)
    lines.push(`Hạng,Tên phim,Doanh thu (VND),Số ghế`)
    report.topMovies.forEach((m: any, i: number) => {
      lines.push(`${i + 1},"${m.title}",${m.revenue},${m.totalSeats}`)
    })
    lines.push(``)
  }

  // Trạng thái đặt vé
  if (report?.bookingStats?.length) {
    lines.push(`=== TRẠNG THÁI ĐẶT VÉ ===`)
    lines.push(`Trạng thái,Số lượng`)
    const statusMap: Record<string, string> = {
      confirmed: 'Đã xác nhận', pending: 'Chờ thanh toán',
      cancelled: 'Đã hủy', checked_in: 'Đã check-in', pending_payment: 'Chờ CK'
    }
    report.bookingStats.forEach((b: any) => {
      lines.push(`${statusMap[b._id] || b._id},${b.count}`)
    })
  }

  const csv = lines.join('\n')
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv)
  a.download = `bao-cao-doanh-thu-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

// ── In PDF: mở cửa sổ in với nội dung sạch ──────────────
function printReport(report: any, revenue: any[], period: string, stats: any) {
  const periodLabel = period === 'day' ? '30 ngày gần nhất' : period === 'month' ? '12 tháng gần nhất' : 'theo năm'
  const dateStr = new Date().toLocaleString('vi-VN')
  const statusMap: Record<string, string> = {
    confirmed: 'Đã xác nhận', pending: 'Chờ thanh toán',
    cancelled: 'Đã hủy', checked_in: 'Đã check-in', pending_payment: 'Chờ CK'
  }

  const revenueRows = revenue.map(r =>
    `<tr><td>${r._id}</td><td style="text-align:right">${r.total.toLocaleString('vi-VN')}đ</td><td style="text-align:right">${r.count}</td></tr>`
  ).join('')

  const topMovieRows = (report?.topMovies || []).map((m: any, i: number) =>
    `<tr><td>${i + 1}</td><td>${m.title}</td><td style="text-align:right">${m.revenue.toLocaleString('vi-VN')}đ</td><td style="text-align:right">${m.totalSeats}</td></tr>`
  ).join('')

  const bookingRows = (report?.bookingStats || []).map((b: any) =>
    `<tr><td>${statusMap[b._id] || b._id}</td><td style="text-align:right">${b.count}</td></tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Báo Cáo Doanh Thu — Popcorn Cinema</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
  .card .label { font-size: 11px; color: #888; margin-bottom: 4px; }
  .card .value { font-size: 18px; font-weight: bold; color: #7c3aed; }
  .card .sub { font-size: 11px; color: #aaa; margin-top: 2px; }
  h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f3f0ff; text-align: left; padding: 7px 10px; font-size: 12px; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>📊 Báo Cáo Doanh Thu — Popcorn Cinema</h1>
  <div class="meta">Kỳ: ${periodLabel} &nbsp;|&nbsp; Xuất lúc: ${dateStr}</div>

  <div class="summary">
    <div class="card"><div class="label">Tổng Doanh Thu</div><div class="value">${(report?.summary?.totalRevenue || 0).toLocaleString('vi-VN')}đ</div><div class="sub">${report?.summary?.totalTransactions || 0} giao dịch</div></div>
    <div class="card"><div class="label">Tổng Đặt Vé</div><div class="value">${stats?.totalBookings ?? 0}</div><div class="sub">Vé hôm nay: ${stats?.todayBookings ?? 0}</div></div>
    <div class="card"><div class="label">Người Dùng Mới</div><div class="value">${report?.newUsersThisMonth || 0}</div><div class="sub">Tháng này</div></div>
    <div class="card"><div class="label">Phim Đang Chiếu</div><div class="value">${stats?.totalMovies ?? 0}</div><div class="sub">now_showing</div></div>
  </div>

  <h2>Doanh Thu Theo Thời Gian</h2>
  <table><thead><tr><th>Thời gian</th><th style="text-align:right">Doanh thu</th><th style="text-align:right">Giao dịch</th></tr></thead>
  <tbody>${revenueRows}</tbody></table>

  ${topMovieRows ? `<h2>Top Phim Doanh Thu</h2>
  <table><thead><tr><th>#</th><th>Tên phim</th><th style="text-align:right">Doanh thu</th><th style="text-align:right">Số ghế</th></tr></thead>
  <tbody>${topMovieRows}</tbody></table>` : ''}

  ${bookingRows ? `<h2>Trạng Thái Đặt Vé</h2>
  <table><thead><tr><th>Trạng thái</th><th style="text-align:right">Số lượng</th></tr></thead>
  <tbody>${bookingRows}</tbody></table>` : ''}

  <div class="footer">Popcorn Cinema — Báo cáo tự động | ${dateStr}</div>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 500)
}

export default function AdminReports() {
  const [period, setPeriod] = useState('month')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reports', period],
    queryFn: () => api.get(`/reports/revenue?period=${period}`),
    select: d => d.data.data,
    refetchInterval: 30000,
  })

  const report = data as any
  const rawRevenue: any[] = report?.revenue || []

  // Fill đủ điểm dữ liệu theo period — tháng/ngày không có data → total: 0
  const revenue = (() => {
    const now = new Date()
    if (period === 'month') {
      // Fill đủ 12 tháng gần nhất
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const found = rawRevenue.find((r: any) => r._id === key)
        return found || { _id: key, total: 0, count: 0 }
      })
    }
    if (period === 'day') {
      // Fill đủ 30 ngày gần nhất
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - 29 + i)
        const key = d.toISOString().split('T')[0]
        const found = rawRevenue.find((r: any) => r._id === key)
        return found || { _id: key, total: 0, count: 0 }
      })
    }
    if (period === 'year') {
      // Fill đủ 5 năm gần nhất
      return Array.from({ length: 5 }, (_, i) => {
        const key = String(now.getFullYear() - 4 + i)
        const found = rawRevenue.find((r: any) => r._id === key)
        return found || { _id: key, total: 0, count: 0 }
      })
    }
    return rawRevenue
  })()
  const maxRev = Math.max(...revenue.map((r: any) => r.total), 1)

  // Stats from admin dashboard too
  const { data: dash } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard'),
    select: d => d.data.data,
  })
  const stats = dash as any

  const SUMMARY = [
    { label: 'Tổng Doanh Thu', value: fmtPrice(report?.summary?.totalRevenue || 0), icon: DollarSign, color: 'var(--color-primary)', sub: `${report?.summary?.totalTransactions || 0} giao dịch` },
    { label: 'Vé Bán Hôm Nay', value: stats?.todayBookings ?? '—', icon: Ticket, color: '#FDE68A', sub: `Tổng: ${stats?.totalBookings ?? 0}` },
    { label: 'Người Dùng Mới', value: report?.newUsersThisMonth || 0, icon: Users, color: '#F472B6', sub: 'Tháng này' },
    { label: 'Phim Đang Chiếu', value: stats?.totalMovies ?? '—', icon: Film, color: 'var(--color-text-muted)', sub: 'now_showing' },
  ]

  const bookingStatMap: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Đã xác nhận', color: 'var(--color-primary)' },
    pending: { label: 'Chờ thanh toán', color: '#FDE68A' },
    cancelled: { label: 'Đã hủy', color: '#F87171' },
    checked_in: { label: 'Đã check-in', color: '#34D399' },
    pending_payment: { label: 'Chờ CK', color: '#F97316' },
  }

  const totalBookingStat = (report?.bookingStats || []).reduce((s: number, b: any) => s + b.count, 0) || 1

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <div className="flex items-center gap-3">
          <Link to="/admin"><ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} /></Link>
          <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Báo Cáo & Doanh Thu</h1>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: period === p.value ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)', border: `1px solid ${period === p.value ? 'var(--color-primary)' : 'var(--color-glass-border)'}`, color: period === p.value ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              {p.label}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg" style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => printReport(report, revenue, period, stats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.25)' }}>
            🖨️ In PDF
          </button>
          <button onClick={() => exportCSV(report, revenue, period)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
            📊 Xuất CSV
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY.map(({ label, value, icon: Icon, color, sub }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-5 rounded-2xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <div className="font-black text-2xl mb-1" style={{ color }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Biểu Đồ Doanh Thu</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Tổng: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{fmtPrice(report?.summary?.totalRevenue || 0)}</span>
              </p>
            </div>
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          </div>

          {isLoading ? (
            <div className="h-56 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.7)' }}>Đang tải...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue} margin={{ top: 4, right: 4, left: 8, bottom: 0 }} barCategoryGap="30%">
                <XAxis
                  dataKey="_id"
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) =>
                    period === 'day' ? v.slice(5) : period === 'month' ? v.slice(5) : v
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v === 0 ? '0' : fmtM(v)}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(168,85,247,0.08)' }}
                  contentStyle={{
                    background: 'var(--color-bg-2)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
                  formatter={(value: number, _: any, props: any) => [
                    `${value.toLocaleString('vi-VN')}đ — ${props.payload.count} giao dịch`,
                    'Doanh thu',
                  ]}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {revenue.map((r: any, i: number) => (
                    <Cell
                      key={i}
                      fill={r.total === maxRev && r.total > 0
                        ? 'var(--color-primary)'
                        : r.total === 0
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(168,85,247,0.45)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Movies */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Film className="w-4 h-4" style={{ color: '#FDE68A' }} /> Top Phim Doanh Thu
            </h2>
            {!report?.topMovies?.length ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {report.topMovies.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: i === 0 ? 'rgba(253,230,138,0.2)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#FDE68A' : 'var(--color-text-dim)' }}>
                      {i + 1}
                    </div>
                    {m.poster && <img src={m.poster} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.totalSeats} ghế</div>
                      {/* Revenue bar */}
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(m.revenue / (report.topMovies[0]?.revenue || 1)) * 100}%`, background: 'linear-gradient(90deg, var(--color-primary), #FDE68A)' }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{fmtM(m.revenue)}đ</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Booking Status + Payment Methods */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl space-y-5"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <div>
              <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Ticket className="w-4 h-4" style={{ color: '#F472B6' }} /> Trạng Thái Đặt Vé
              </h2>
              <div className="space-y-2">
                {(report?.bookingStats || []).map((b: any) => {
                  const cfg = bookingStatMap[b._id] || { label: b._id, color: '#888' }
                  const pct = Math.round((b.count / totalBookingStat) * 100)
                  return (
                    <div key={b._id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{b.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full rounded-full" style={{ background: cfg.color }} />
                      </div>
                    </div>
                  )
                })}
                {!report?.bookingStats?.length && (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: 'var(--color-glass-border)' }}>
              {[
                { label: 'Tổng Đặt Vé', v: stats?.totalBookings ?? 0, c: 'var(--color-primary)' },
                { label: 'Tổng Người Dùng', v: stats?.totalUsers ?? 0, c: '#F472B6' },
                { label: 'Doanh Thu Tháng', v: fmtPrice(report?.summary?.totalRevenue || 0), c: '#FDE68A' },
                { label: 'Giao Dịch', v: report?.summary?.totalTransactions ?? 0, c: '#A78BFA' },
              ].map(({ label, v, c }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: `${c}0a` }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                  <div className="font-bold text-sm" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Admin quick links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="p-4 rounded-2xl flex gap-3 flex-wrap"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <span className="text-sm font-semibold self-center" style={{ color: 'var(--color-text-muted)' }}>Xác nhận nhanh:</span>
          {[
            { href: '/admin/payments', label: '💰 Xác Nhận CK' },
            { href: '/staff/checkin', label: '📷 Check-in' },
            { href: '/staff/counter', label: '🎫 Bán Vé Quầy' },
            { href: '/admin', label: '🏠 Dashboard' },
          ].map(({ href, label }) => (
            <Link key={href} to={href}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: 'var(--color-primary)' }}>
              {label}
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  )
}