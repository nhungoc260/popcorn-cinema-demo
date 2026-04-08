import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

const fmtPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ'

export default function AdminPayments() {
  const qc = useQueryClient()
  const [rejectModal, setRejectModal] = useState<{ id: string; txn: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: () => api.get('/payments/pending'),
    select: d => d.data.data,
    refetchInterval: 10000, // auto refresh 10s
  })

  const { mutate: confirmPayment, isPending: confirming } = useMutation({
    mutationFn: (paymentId: string) => api.post('/payments/admin-confirm', { paymentId }),
    onSuccess: (_, paymentId) => {
      toast.success('✅ Đã xác nhận thanh toán!')
      qc.invalidateQueries({ queryKey: ['admin-pending-payments'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xác nhận'),
  })

  const { mutate: rejectPayment, isPending: rejecting } = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      api.post('/payments/admin-reject', { paymentId, reason }),
    onSuccess: () => {
      toast.success('❌ Đã từ chối thanh toán')
      setRejectModal(null)
      setRejectReason('')
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
              💰 Xác Nhận Thanh Toán
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Danh sách chờ xác nhận chuyển khoản
            </p>
          </div>
          <div className="flex items-center gap-3">
            {payments.length > 0 && (
              <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                {payments.length} chờ xử lý
              </span>
            )}
            <button onClick={() => refetch()} className="p-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              <RefreshCw className="w-4 h-4" />
            </button>
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
              const isUrgent = p.status === 'customer_confirmed'
              return (
                <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'var(--color-bg-2)',
                    border: `1px solid ${isUrgent ? 'rgba(168,85,247,0.3)' : 'var(--color-glass-border)'}`,
                    boxShadow: isUrgent ? '0 0 20px rgba(168,85,247,0.1)' : 'none',
                  }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status badge */}
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
                        style={{ background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }}>
                        {isUrgent && '🔔 '}{st.label}
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

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <motion.button
                        onClick={() => confirmPayment(p._id)}
                        disabled={confirming}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                        <CheckCircle className="w-4 h-4" />
                        Xác Nhận
                      </motion.button>
                      <motion.button
                        onClick={() => setRejectModal({ id: p._id, txn: p.transactionId })}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                        <XCircle className="w-4 h-4" />
                        Từ Chối
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md p-6 rounded-3xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Từ chối thanh toán</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Mã GD: {rejectModal.txn}</p>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>Lý do từ chối (sẽ thông báo cho khách)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="VD: Không tìm thấy giao dịch, sai nội dung..."
                className="w-full p-3 rounded-xl text-sm outline-none resize-none mb-4"
                style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
              />
              <div className="flex gap-3">
                <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                  Hủy
                </button>
                <button onClick={() => rejectPayment({ paymentId: rejectModal.id, reason: rejectReason })}
                  disabled={rejecting || !rejectReason.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                  {rejecting ? 'Đang từ chối...' : 'Xác nhận Từ Chối'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
