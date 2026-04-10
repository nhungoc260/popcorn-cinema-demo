// src/pages/MyBookingsPage.tsx
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, Ticket, XCircle, CheckCircle, QrCode, AlertCircle, FileText } from 'lucide-react'
import { bookingApi } from '../api'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtPrice = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:         { label: 'Chờ thanh toán',   color: '#FDE68A',              icon: Clock },
  confirmed:       { label: 'Đã xác nhận',       color: 'var(--color-primary)', icon: CheckCircle },
  cancelled:       { label: 'Đã hủy',            color: '#F87171',              icon: XCircle },
  checked_in:      { label: 'Đã vào rạp',        color: 'var(--color-text-muted)', icon: QrCode },
  pending_payment: { label: 'Chờ xác nhận CK',   color: '#FB923C',              icon: AlertCircle },
  refunded:        { label: 'Đã hoàn tiền',       color: '#a78bfa',              icon: XCircle },
}

export default function MyBookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingApi.getMy(),
    select: d => d.data.data,
  })

  const bookings = data as any[] || []

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display font-bold text-2xl mb-8" style={{ color: 'var(--color-text)' }}>
            🎟 Vé Của Tôi
          </h1>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl skeleton" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 rounded-3xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--color-text)' }}>Chưa có vé nào</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Đặt vé ngay để trải nghiệm!</p>
              <Link to="/movies" className="btn-primary px-8 py-3 inline-block">Xem Phim Ngay</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b: any, i: number) => {
                const status = STATUS_MAP[b.status] || STATUS_MAP.pending
                const StatusIcon = status.icon
                const isPaid = b.status === 'confirmed' || b.status === 'checked_in'

                return (
                  <motion.div key={b._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                    style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                  >
                    <div className="flex gap-4 p-4 md:p-5">
                      {/* Poster */}
                      <div className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        {b.showtime?.movie?.poster ? (
                          <img src={b.showtime.movie.poster} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl"
                            style={{ background: 'var(--color-bg-3)' }}>🎬</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-text)' }}>
                            {b.showtime?.movie?.title || 'Không rõ'}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-full"
                            style={{ background: `${status.color}15`, border: `1px solid ${status.color}40` }}>
                            <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
                            <span className="text-xs font-medium" style={{ color: status.color }}>{status.label}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {b.showtime?.startTime && (
                            <>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(b.showtime.startTime)}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtTime(b.showtime.startTime)}</span>
                            </>
                          )}
                          {b.showtime?.theater?.name && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.showtime.theater.name}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ghế: </span>
                            <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{b.seatLabels?.join(', ')}</span>
                          </div>
                          <span className="font-bold text-sm text-gradient-gold">{fmtPrice(b.paidAmount ?? b.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action bar */}
                    <div className="px-4 pb-4 flex gap-2 flex-wrap">
                      {/* Vé hợp lệ — hiện QR + hoá đơn */}
                      {isPaid && (
                        <>
                          <Link to={`/booking-success/${b._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                            <QrCode className="w-3.5 h-3.5" /> Xem Vé
                          </Link>
                          <Link to={`/invoice/${b._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                            <FileText className="w-3.5 h-3.5" /> Hoá Đơn
                          </Link>
                        </>
                      )}

                      {/* Vé đã hủy hoặc hoàn tiền — chỉ hiện nhãn, KHÔNG có link QR */}
                      {(b.status === 'cancelled' || b.status === 'refunded') && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: b.status === 'refunded' ? 'rgba(167,139,250,0.08)' : 'rgba(248,113,113,0.08)',
                            border: `1px solid ${b.status === 'refunded' ? 'rgba(167,139,250,0.25)' : 'rgba(248,113,113,0.25)'}`,
                            color: b.status === 'refunded' ? '#a78bfa' : '#F87171',
                          }}>
                          {b.status === 'refunded' ? '💸 Đã hoàn tiền' : '❌ Vé không còn hiệu lực'}
                        </div>
                      )}

                      {/* Chờ thanh toán */}
                      {b.status === 'pending' && (
                        <Link to={`/payment/${b._id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                          💳 Thanh Toán
                        </Link>
                      )}

                      {b.status === 'pending_payment' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: '#FB923C' }}>
                          <AlertCircle className="w-3.5 h-3.5" /> Đang chờ nhân viên xác nhận
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}