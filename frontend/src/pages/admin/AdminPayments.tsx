import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, AlertTriangle, RefreshCw, Search, X, MapPin, Clock, Armchair } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

const fmtPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ'
const fmtDate  = (d: string) => new Date(d).toLocaleString('vi-VN')

export default function AdminPayments() {
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [cancelModal, setCancelModal] = useState<any | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: () => api.get('/payments/pending'),
    select: d => d.data.data,
    refetchInterval: 10000,
  })

  const { mutate: cancelFraud, isPending: cancelling } = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      api.post('/payments/admin-reject', { paymentId, reason }),
    onSuccess: () => {
      toast.success('❌ Đã hủy vé và hoàn ghế')
      setCancelModal(null); setCancelReason('')
      qc.invalidateQueries({ queryKey: ['admin-pending-payments'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const payments = (data as any[]) || []

  // ── Tìm kiếm ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return payments
    return payments.filter((p: any) =>
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q) ||
      p.transactionId?.toLowerCase().includes(q) ||
      p.booking?.bookingCode?.toLowerCase().includes(q) ||
      p.booking?.showtime?.movie?.title?.toLowerCase().includes(q) ||
      p.booking?.showtime?.room?.theater?.name?.toLowerCase().includes(q)
    )
  }, [payments, search])

  const statusLabel = (s: string) => ({
    pending_confirmation: { label: 'Chờ chuyển', color: '#FDE68A' },
    customer_confirmed:   { label: 'Đã chuyển - Chờ xác nhận', color: 'var(--color-primary)' },
  }[s] || { label: s, color: '#aaa' })

  return (
    <div className="min-h-screen pt-20 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--color-text)' }}>
              📋 Lịch Sử Chuyển Khoản
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Thanh toán tự động xác nhận — chỉ xem & xử lý khi phát hiện gian lận
            </p>
          </div>
          <div className="flex items-center gap-3">
            {payments.length > 0 && (
              <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                ⚡ Tự động xác nhận
              </span>
            )}
            <button onClick={() => refetch()}
              className="p-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Info banner ── */}
        <div className="mb-4 p-4 rounded-2xl flex gap-3"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <span className="text-xl flex-shrink-0">⚡</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#34D399' }}>Hệ thống tự động xác nhận</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Khi khách bấm "Đã Thanh Toán", vé được xác nhận ngay. Nếu phát hiện khách{' '}
              <b style={{ color: '#F87171' }}>chưa thực sự chuyển tiền</b>, bấm{' '}
              <b style={{ color: '#F87171' }}>Hủy Vé</b> để thu hồi ghế.
            </p>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên khách, mã GD, mã vé, phim, rạp..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: 'var(--color-bg-2)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>

        {/* ── Count ── */}
        {search && (
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Tìm thấy <b style={{ color: 'var(--color-text)' }}>{filtered.length}</b> kết quả
          </p>
        )}

        {/* ── List ── */}
        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.7)' }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {search ? 'Không tìm thấy kết quả' : 'Không có giao dịch chờ xử lý'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {search ? 'Thử từ khóa khác nhé' : 'Trang tự động cập nhật mỗi 10 giây'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((p: any) => {
                const st       = statusLabel(p.status)
                const showtime = p.booking?.showtime
                const movie    = showtime?.movie?.title  || 'N/A'
                const theater  = showtime?.room?.theater?.name || null
                const room     = showtime?.room?.name    || null
                const seats    = p.booking?.seatLabels?.join(', ') || null
                const showDate = showtime?.date
                  ? new Date(showtime.date).toLocaleDateString('vi-VN')
                  : null
                const showTime = showtime?.startTime || null

                return (
                  <motion.div key={p._id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-5 rounded-2xl"
                    style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">

                        {/* Status + booking code */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }}>
                            {st.label}
                          </span>
                          {p.booking?.bookingCode && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded-lg"
                              style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                              #{p.booking.bookingCode}
                            </span>
                          )}
                        </div>

                        {/* Payment info grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Khách: </span>
                            <span style={{ color: 'var(--color-text)' }}>{p.user?.name || 'N/A'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Phim: </span>
                            <span style={{ color: 'var(--color-text)' }}>{movie}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Số tiền: </span>
                            <span className="font-bold" style={{ color: '#FDE68A' }}>{fmtPrice(p.amount)}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Phương thức: </span>
                            <span style={{ color: 'var(--color-text)' }}>
                              {p.method === 'bank' ? '💳 Chuyển khoản' : p.method === 'momo' ? '📱 MoMo' : '🏦 VietQR'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span style={{ color: 'var(--color-text-muted)' }}>Mã GD: </span>
                            <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{p.transactionId}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Thời gian: </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(p.createdAt)}</span>
                          </div>
                        </div>

                        {/* ── Ticket info box ── */}
                        {(seats || theater || showDate) && (
                          <div className="mt-2 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
                            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>

                            {seats && (
                              <div className="flex items-center gap-1.5">
                                <Armchair className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                                <span style={{ color: 'var(--color-text-muted)' }}>Ghế: </span>
                                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{seats}</span>
                              </div>
                            )}

                            {(showDate || showTime) && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                                <span style={{ color: 'var(--color-text-muted)' }}>Suất: </span>
                                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                  {[showTime, showDate].filter(Boolean).join(' — ')}
                                </span>
                              </div>
                            )}

                            {(theater || room) && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                                <span style={{ color: 'var(--color-text-muted)' }}>Rạp: </span>
                                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                  {[theater, room].filter(Boolean).join(' · ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cancel button */}
                      <div className="flex-shrink-0">
                        <motion.button
                          onClick={() => setCancelModal(p)}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                          style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                          <AlertTriangle className="w-4 h-4" />
                          Hủy Vé
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-3xl"
            style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.12)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#F87171' }} />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Hủy vé gian lận</h3>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mã GD: {cancelModal.transactionId}</p>
              </div>
            </div>

            {/* Ticket summary in modal */}
            {(cancelModal.booking?.seatLabels?.length || cancelModal.booking?.showtime) && (
              <div className="p-3 rounded-xl mb-4 text-xs space-y-1"
                style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p><span style={{ color: 'var(--color-text-muted)' }}>Phim: </span>
                  <b style={{ color: 'var(--color-text)' }}>{cancelModal.booking?.showtime?.movie?.title || 'N/A'}</b></p>
                {cancelModal.booking?.seatLabels?.length > 0 && (
                  <p><span style={{ color: 'var(--color-text-muted)' }}>Ghế: </span>
                    <b style={{ color: 'var(--color-text)' }}>{cancelModal.booking.seatLabels.join(', ')}</b></p>
                )}
                {cancelModal.booking?.showtime?.room?.theater?.name && (
                  <p><span style={{ color: 'var(--color-text-muted)' }}>Rạp: </span>
                    <b style={{ color: 'var(--color-text)' }}>{cancelModal.booking.showtime.room.theater.name}</b></p>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl mb-4"
              style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Sẽ hủy booking + giải phóng ghế + thông báo socket cho khách.
              </p>
            </div>

            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Lý do hủy</p>
            <div className="flex gap-2 flex-wrap mb-2">
              {['Không tìm thấy giao dịch', 'Sai nội dung CK', 'Số tiền không khớp', 'Gian lận'].map(r => (
                <button key={r} onClick={() => setCancelReason(r)}
                  className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: cancelReason === r ? 'rgba(248,113,113,0.15)' : 'var(--color-bg-3)',
                    color: cancelReason === r ? '#F87171' : 'var(--color-text-muted)',
                    border: `1px solid ${cancelReason === r ? 'rgba(248,113,113,0.4)' : 'var(--color-glass-border)'}`,
                  }}>{r}</button>
              ))}
            </div>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              rows={2} placeholder="Hoặc nhập lý do tùy chỉnh..."
              className="w-full p-3 rounded-xl text-sm outline-none resize-none mb-4"
              style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
            <div className="flex gap-3">
              <button onClick={() => { setCancelModal(null); setCancelReason('') }}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                Thôi
              </button>
              <button
                onClick={() => cancelFraud({ paymentId: cancelModal._id, reason: cancelReason || 'Admin hủy' })}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                {cancelling ? 'Đang hủy...' : '❌ Xác nhận Hủy Vé'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}