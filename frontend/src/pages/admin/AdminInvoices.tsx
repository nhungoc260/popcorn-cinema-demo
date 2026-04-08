// src/pages/admin/AdminInvoices.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, FileText } from 'lucide-react'
import { adminApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import api from '../../api'
import toast from 'react-hot-toast'

const fmtPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ'
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  success:              { label: 'Thành công',      color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  pending:              { label: 'Chờ xử lý',       color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  pending_confirmation: { label: 'Chờ xác nhận',    color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  customer_confirmed:   { label: 'KH đã xác nhận',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  failed:               { label: 'Thất bại',         color: '#f43f5e', bg: 'rgba(244,63,94,0.1)'   },
  refunded:             { label: 'Hoàn tiền',        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
}

const METHOD_CFG: Record<string, { label: string; icon: string }> = {
  cash:   { label: 'Tiền mặt',     icon: '💵' },
  bank:   { label: 'Chuyển khoản', icon: '💳' },
  vietqr: { label: 'VietQR',       icon: '🏦' },
  momo:   { label: 'MoMo',         icon: '📱' },
}

export default function AdminInvoices() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const qc = useQueryClient()
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [selected, setSelected]       = useState<any>(null)
  const [changingStatus, setChangingStatus] = useState(false)

  // Các trạng thái có thể chuyển đổi (chỉ Admin)
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    success:              ['refunded', 'failed'],
    failed:               ['success', 'pending_confirmation'],
    refunded:             ['success'],
    pending_confirmation: ['success', 'failed'],
    customer_confirmed:   ['success', 'failed'],
    pending:              ['success', 'failed'],
  }

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/invoices/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      toast.success(`Đã chuyển trạng thái → ${STATUS_CFG[status]?.label}`)
      qc.invalidateQueries({ queryKey: ['admin-invoices'] })
      setSelected((prev: any) => prev ? { ...prev, status } : null)
      setChangingStatus(false)
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Có lỗi xảy ra')
      setChangingStatus(false)
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', page, search, statusFilter, methodFilter],
    queryFn: () => adminApi.getInvoices({ page, limit: 20, search, status: statusFilter || undefined, method: methodFilter || undefined }),
    select: d => d.data,
  })
  const result = data as any
  const invoices: any[] = result?.data || []
  const total: number   = result?.pagination?.total || 0
  const totalPages      = Math.ceil(total / 20)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </Link>
          <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>
            🧾 Quản Lý Hóa Đơn
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)' }}>
            {total} hóa đơn
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-[240px]">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
              placeholder="Tìm mã vé, tên khách, email..."
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
            />
            <button onClick={() => { setSearch(searchInput); setPage(1) }}
              className="px-3 py-2 rounded-xl"
              style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <Search size={15} />
            </button>
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* Method filter */}
          <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
            <option value="">Tất cả PT thanh toán</option>
            {Object.entries(METHOD_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl skeleton" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Không có hóa đơn nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Mã vé', 'Khách hàng', 'Phim', 'Phương thức', 'Số tiền', 'Trạng thái', 'Thời gian', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any, i: number) => {
                  const st = STATUS_CFG[inv.status] || STATUS_CFG.pending
                  const mt = METHOD_CFG[inv.method] || { label: inv.method, icon: '💰' }
                  return (
                    <motion.tr key={inv._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                          {inv.booking?.bookingCode || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          {inv.user?.name || 'Khách vãng lai'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {inv.user?.email || ''}
                        </div>
                        {inv.soldBy && (
                          <div className="text-xs mt-0.5" style={{ color: '#fbbf24' }}>
                            👤 NV: {inv.soldBy?.name || 'Staff'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                          {inv.booking?.showtime?.movie?.title || '—'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {inv.booking?.seatLabels?.join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{mt.icon} {mt.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: '#fde68a' }}>
                          {fmtPrice(inv.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtDate(inv.createdAt)}
                        {inv.paidAt && (
                          <div style={{ color: '#34d399' }}>✓ {fmtDate(inv.paidAt)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(inv)}
                          className="text-xs px-2 py-1 rounded-lg transition-all"
                          style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.2)' }}>
                          Chi tiết
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              ← Trước
            </button>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Trang {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                🧾 Chi tiết hóa đơn
              </h2>
              <button onClick={() => setSelected(null)} className="text-xs px-2 py-1 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-3">
              {[
                { label: 'Mã giao dịch', value: selected.transactionId },
                { label: 'Mã vé',        value: selected.booking?.bookingCode },
                { label: 'Khách hàng',   value: selected.user?.name || 'Khách vãng lai' },
                { label: 'Email',        value: selected.user?.email || '—' },
                { label: 'Phim',         value: selected.booking?.showtime?.movie?.title || '—' },
                { label: 'Ghế',          value: selected.booking?.seatLabels?.join(', ') || '—' },
                { label: 'Số tiền',      value: fmtPrice(selected.amount) },
                { label: 'PT thanh toán', value: `${METHOD_CFG[selected.method]?.icon} ${METHOD_CFG[selected.method]?.label || selected.method}` },
                { label: 'Tạo lúc',      value: fmtDate(selected.createdAt) },
                ...(selected.paidAt ? [{ label: 'Thanh toán lúc', value: fmtDate(selected.paidAt) }] : []),
                ...(selected.soldBy ? [{ label: 'Nhân viên bán', value: selected.soldBy?.name || 'Staff' }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
                </div>
              ))}

              {/* Trạng thái hiện tại */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Trạng thái</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: STATUS_CFG[selected.status]?.bg, color: STATUS_CFG[selected.status]?.color, border: `1px solid ${STATUS_CFG[selected.status]?.color}30` }}>
                  {STATUS_CFG[selected.status]?.label || selected.status}
                </span>
              </div>

              {/* Đổi trạng thái — chỉ Admin */}
              {isAdmin && ALLOWED_TRANSITIONS[selected.status]?.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs mb-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
                    🔧 Chuyển trạng thái:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALLOWED_TRANSITIONS[selected.status].map(newStatus => {
                      const cfg = STATUS_CFG[newStatus]
                      return (
                        <button key={newStatus}
                          disabled={changingStatus}
                          onClick={() => {
                            if (window.confirm(`Xác nhận chuyển sang "${cfg.label}"?`)) {
                              setChangingStatus(true)
                              changeStatus({ id: selected._id, status: newStatus })
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                          → {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}