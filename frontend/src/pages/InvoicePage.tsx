// src/pages/InvoicePage.tsx
// Trang xem chi tiết hoá đơn + xuất PDF
// Route: /invoice/:bookingId

import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer, CheckCircle, Clock, XCircle } from 'lucide-react'
import api, { bookingApi } from '../api'
import { useRef } from 'react'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  confirmed:    { label: 'Đã xác nhận', color: '#34D399', icon: CheckCircle },
  checked_in:   { label: 'Đã vào rạp',  color: '#60A5FA', icon: CheckCircle },
  pending:      { label: 'Chờ thanh toán', color: '#FDE68A', icon: Clock },
  pending_payment: { label: 'Chờ xác nhận', color: '#FB923C', icon: Clock },
  cancelled:    { label: 'Đã huỷ',      color: '#F87171', icon: XCircle },
}

export default function InvoicePage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const printRef = useRef<HTMLDivElement>(null)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['invoice', bookingId],
    queryFn: () => bookingApi.getOne(bookingId!),
    select: d => d.data.data,
  })

  // Lấy payment để có số tiền thực tế sau giảm giá
  const { data: paymentData } = useQuery({
    queryKey: ['invoice-payment', bookingId],
    queryFn: () => api.get(`/payments/by-booking/${bookingId}`),
    select: d => d.data.data,
    enabled: !!(booking as any)?._id,
  })
  const pmt = paymentData as any

  const b = booking as any
  const status = STATUS_MAP[b?.status] || STATUS_MAP.pending
  const StatusIcon = status.icon

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Hoá đơn - ${b?.bookingCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
          .invoice-box { max-width: 680px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #4c1d95, #2e1065); color: white; padding: 28px 32px; }
          .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          .header p { font-size: 13px; opacity: 0.75; }
          .body { padding: 28px 32px; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .row:last-child { border-bottom: none; }
          .label { font-size: 13px; color: #64748b; }
          .value { font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; }
          .total-row { background: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
          .total-label { font-size: 15px; font-weight: 600; color: #475569; }
          .total-value { font-size: 20px; font-weight: 800; color: #7c3aed; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .status-confirmed { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef9c3; color: #854d0e; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 20px 0 10px; }
          .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          .code { font-family: monospace; font-size: 18px; font-weight: 800; color: #7c3aed; letter-spacing: 2px; }
          @media print { body { padding: 0; } .invoice-box { border: none; border-radius: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <h1>🎬 POPCORN CINEMA</h1>
            <p>Hoá Đơn Đặt Vé Xem Phim</p>
          </div>
          <div class="body">
            <p class="section-title">Thông tin đặt vé</p>
            <div class="row">
              <span class="label">Mã đặt vé</span>
              <span class="code">${b?.bookingCode || '—'}</span>
            </div>
            <div class="row">
              <span class="label">Trạng thái</span>
              <span class="badge status-${b?.status === 'confirmed' || b?.status === 'checked_in' ? 'confirmed' : b?.status === 'cancelled' ? 'cancelled' : 'pending'}">
                ${status.label}
              </span>
            </div>
            <div class="row">
              <span class="label">Ngày đặt</span>
              <span class="value">${b?.createdAt ? fmtDateTime(b.createdAt) : '—'}</span>
            </div>

            <p class="section-title">Thông tin phim</p>
            <div class="row">
              <span class="label">Phim</span>
              <span class="value">${b?.showtime?.movie?.title || '—'}</span>
            </div>
            <div class="row">
              <span class="label">Ngày chiếu</span>
              <span class="value">${b?.showtime?.startTime ? fmtDate(b.showtime.startTime) : '—'}</span>
            </div>
            <div class="row">
              <span class="label">Giờ chiếu</span>
              <span class="value">${b?.showtime?.startTime ? fmtTime(b.showtime.startTime) : '—'}</span>
            </div>
            <div class="row">
              <span class="label">Rạp chiếu</span>
              <span class="value">${b?.showtime?.theater?.name || '—'}</span>
            </div>
            <div class="row">
              <span class="label">Phòng chiếu</span>
              <span class="value">${b?.showtime?.room?.name || '—'}</span>
            </div>
            <div class="row">
              <span class="label">Ghế ngồi</span>
              <span class="value">${b?.seatLabels?.join(', ') || '—'}</span>
            </div>
            <div class="row">
              <span class="label">Số ghế</span>
              <span class="value">${b?.seatLabels?.length || 0} ghế</span>
            </div>

            <div class="total-row">
              <span class="total-label">Tổng thanh toán</span>
              <span class="total-value">${pmt?.amount ? fmtPrice(pmt.amount) : b?.totalAmount ? fmtPrice(b.totalAmount) : '—'}</span>
            </div>
            ${pmt?.originalAmount && pmt.originalAmount > pmt.amount ? `
            <div class="row" style="margin-top:8px">
              <span class="label" style="color:#64748b">Giá gốc</span>
              <span class="value" style="text-decoration:line-through;color:#94a3b8">${fmtPrice(pmt.originalAmount)}</span>
            </div>
            <div class="row">
              <span class="label" style="color:#16a34a">Giảm giá (điểm + hạng thẻ)</span>
              <span class="value" style="color:#16a34a">-${fmtPrice(pmt.originalAmount - pmt.amount)}</span>
            </div>` : ''}
          </div>
          <div class="footer">
            Cảm ơn bạn đã chọn Popcorn Cinema · Hotline: 1900 xxxx · popcorncinema.vn
          </div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-12 rounded-xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
          <div className="h-48 rounded-2xl skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header nav */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/my-bookings" className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} /> Vé của tôi
          </Link>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)' }}>
              <Printer size={14} /> In / Xuất PDF
            </button>
          </div>
        </div>

        {/* Invoice card */}
        <motion.div
          ref={printRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        >
          {/* Invoice header */}
          <div className="p-7"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(8,145,178,0.08))' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>
                  🎬 POPCORN CINEMA
                </p>
                <h1 className="font-black text-2xl" style={{ color: 'var(--color-text)' }}>Hoá Đơn</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Đặt vé xem phim
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <StatusIcon size={14} style={{ color: status.color }} />
                  <span className="text-sm font-semibold" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </div>
                <p className="font-mono font-bold mt-1" style={{ color: '#FDE68A', fontSize: 13 }}>
                  {b?.bookingCode}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {b?.createdAt ? fmtDateTime(b.createdAt) : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="p-7 space-y-6">
            {/* Thông tin phim */}
            <div>
              <p className="text-xs font-bold tracking-widest mb-3"
                style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Thông tin phim
              </p>
              <div className="flex gap-4">
                {b?.showtime?.movie?.poster && (
                  <img src={b.showtime.movie.poster} alt=""
                    className="w-16 h-24 object-cover rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 space-y-2">
                  <h2 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text)' }}>
                    {b?.showtime?.movie?.title || '—'}
                  </h2>
                  {[
                    { label: 'Ngày chiếu', value: b?.showtime?.startTime ? fmtDate(b.showtime.startTime) : '—' },
                    { label: 'Giờ chiếu', value: b?.showtime?.startTime ? fmtTime(b.showtime.startTime) : '—' },
                    { label: 'Rạp', value: b?.showtime?.theater?.name || '—' },
                    { label: 'Phòng', value: b?.showtime?.room?.name || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      <span style={{ color: 'var(--color-text)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-dashed border-t" style={{ borderColor: 'var(--color-glass-border)' }} />

            {/* Chi tiết ghế */}
            <div>
              <p className="text-xs font-bold tracking-widest mb-3"
                style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Chi tiết vé
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Số ghế</span>
                  <span style={{ color: 'var(--color-text)' }}>{b?.seatLabels?.length || 0} ghế</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Ghế ngồi</span>
                  <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {b?.seatLabels?.join(', ') || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Đơn giá trung bình</span>
                  <span style={{ color: 'var(--color-text)' }}>
                    {b?.totalAmount && b?.seatLabels?.length
                      ? fmtPrice(Math.round(b.totalAmount / b.seatLabels.length))
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-dashed border-t" style={{ borderColor: 'var(--color-glass-border)' }} />

            {/* Giảm giá nếu có */}
            {pmt?.originalAmount && pmt.originalAmount > pmt.amount && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Giá gốc</span>
                  <span style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                    {fmtPrice(pmt.originalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#34d399' }}>Giảm giá (điểm + hạng thẻ)</span>
                  <span style={{ color: '#34d399' }}>-{fmtPrice(pmt.originalAmount - pmt.amount)}</span>
                </div>
              </div>
            )}

            {/* Tổng tiền */}
            <div className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Tổng thanh toán</span>
              <div className="text-right">
                {pmt?.originalAmount && pmt.originalAmount > pmt.amount && (
                  <div className="text-sm line-through mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {fmtPrice(pmt.originalAmount)}
                  </div>
                )}
                <span className="font-black text-2xl" style={{ color: 'var(--color-primary)' }}>
                  {pmt?.amount ? fmtPrice(pmt.amount) : b?.totalAmount ? fmtPrice(b.totalAmount) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 text-center text-xs"
            style={{ borderTop: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
            Cảm ơn bạn đã chọn Popcorn Cinema · Hotline: 1900 xxxx
          </div>
        </motion.div>

        {/* Bottom actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={handlePrint}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white' }}>
            <Download size={15} /> Xuất PDF
          </button>
          <Link to={`/booking-success/${bookingId}`}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
            🎫 Xem Vé
          </Link>
        </div>
      </div>
    </div>
  )
}