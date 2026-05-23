import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

const fmtPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ'

export default function AdminPayments() {
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: () => api.get('/payments/pending'),
    select: d => d.data.data,
    refetchInterval: 10000, // auto refresh 10s
  })

  const [cancelModal, setCancelModal]   = useState<any | null>(null)
  const [cancelReason, setCancelReason] = useState('')
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

  const statusLabel = (s: string) => ({
    pending_confirmation: { label: 'Chờ chuyển', color: '#FDE68A' },
    customer_confirmed: { label: 'Đã chuyển - Chờ xác nhận', color: 'var(--color-primary)' },
  }[s] || { label: s, color: '#aaa' })

  return (
    <div className="min-h-screen pt-20 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
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
            <button onClick={() => refetch()} className="p-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-2xl flex gap-3"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <span className="text-xl flex-shrink-0">⚡</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#34D399' }}>Hệ thống tự động xác nhận</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Khi khách bấm "Đã Thanh Toán", vé được xác nhận ngay. Nếu phát hiện khách
              <b style={{ color: '#F87171' }}> chưa thực sự chuyển tiền</b>, bấm <b style={{ color: '#F87171' }}>Hủy Vé</b> để thu hồi ghế.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.7)' }}>Đang tải...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Không có giao dịch chờ xử lý</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Trang tự động cập nhật mỗi 10 giây</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((p: any) => {
              const st = statusLabel(p.status)
              return (
                <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'var(--color-bg-2)',
                    border: '1px solid var(--color-glass-border)',
                  }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status badge */}
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
                        style={{ background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }}>
                        {st.label}
                      </span>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Khách: </span>
                          <span style={{ color: 'var(--color-text)' }}>{p.user?.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Phim: </span>
                          <span style={{ color: 'var(--color-text)' }}>{p.booking?.showtime?.movie?.title || 'N/A'}</span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Số tiền: </span>
                            {p.finalAmount && p.finalAmount !== p.amount ? (
                              <>
                                <span className="text-xs line-through mr-1" style={{ color: 'var(--color-text-dim)' }}>{fmtPrice(p.amount)}</span>
                                <span className="font-bold" style={{ color: '#34D399' }}>{fmtPrice(p.finalAmount)}</span>
                              </>
                            ) : (
                              <span className="font-bold" style={{ color: '#FDE68A' }}>{fmtPrice(p.amount)}</span>
                            )}
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Phương thức: </span>
                          <span style={{ color: 'var(--color-text)' }}>{p.method === 'bank' ? '💳 Chuyển khoản' : p.method === 'momo' ? '📱 MoMo' : '🏦 VietQR'}</span>
                        </div>
                        <div className="col-span-2">
                          <span style={{ color: 'var(--color-text-muted)' }}>Mã GD: </span>
                          <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{p.transactionId}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Thời gian: </span>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(p.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

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
          </div>
        )}

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
    </div>
  )
}
