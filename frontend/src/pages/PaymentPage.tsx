import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Clock, AlertCircle, RefreshCw, Coins } from 'lucide-react'
import api, { bookingApi, paymentApi } from '../api'
import BookingSteps from '../components/booking/BookingSteps'
import toast from 'react-hot-toast'

const REAL_VIETQR = '/vietqr.jpg'
const MOMO_QR = '/momo-qr.png'

const METHODS = [
  { id: 'momo',   label: 'MoMo',         icon: '📱', desc: 'Quét QR MoMo',        color: '#AE2070', selfConfirm: false },
  { id: 'vietqr', label: 'VietQR',        icon: '🏦', desc: 'Quét QR ngân hàng',   color: 'var(--color-primary)', selfConfirm: false },
  { id: 'bank',   label: 'Chuyển khoản', icon: '💳', desc: 'Vietcombank / BIDV',  color: '#FDE68A', selfConfirm: false },
]

const fmtPrice = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const TIER_LABEL: Record<string, string> = {
  bronze: '🥉 Đồng', silver: '🥈 Bạc', gold: '🥇 Vàng', platinum: '💎 Bạch Kim'
}

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [method, setMethod] = useState('momo')
  const [qrData, setQrData] = useState<string | null>(null)
  const [txnId, setTxnId] = useState<string | null>(null)
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)
  const [step, setStep] = useState<'choose' | 'qr' | 'waiting' | 'done'>('choose')
  const [initiated, setInitiated] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Loyalty states
  const [usePoints, setUsePoints] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [discount, setDiscount] = useState<any>(null)
  const [loadingDiscount, setLoadingDiscount] = useState(false)

  const { data: bookingData } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getOne(bookingId!),
    select: d => d.data.data,
  })

  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.get('/bookings/loyalty'),
    select: d => d.data.data,
  })

  useEffect(() => {
    if (step === 'waiting' && txnId) {
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/payments/status/${txnId}`)
          if (data.data.status === 'success') {
            clearInterval(pollRef.current!)
            setStep('done')
            setTimeout(() => navigate(`/booking-success/${bookingId}`), 1500)
          } else if (data.data.status === 'failed') {
            clearInterval(pollRef.current!)
            toast.error('Thanh toán bị từ chối. Vui lòng thử lại.')
            setStep('choose')
            setInitiated(false)
          }
        } catch {}
      }, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, txnId])

  const handleApplyPoints = async () => {
    if (!bookingId || pointsToUse <= 0) return
    setLoadingDiscount(true)
    try {
      const res = await api.post('/bookings/apply-points', { bookingId, pointsToUse })
      setDiscount(res.data.data)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi tính điểm')
    } finally {
      setLoadingDiscount(false)
    }
  }

  const handleTogglePoints = (val: boolean) => {
    setUsePoints(val)
    if (!val) {
      setDiscount(null)
      setPointsToUse(0)
    }
  }

  const { mutate: initiate, isPending: initiating } = useMutation({
    mutationFn: () => paymentApi.initiate(bookingId!, method, finalAmount, discount?.actualPointsUsed || 0),
    onSuccess: ({ data }) => {
      setQrData(data.data.qrData)
      setTxnId(data.data.transactionId)
      setRequiresConfirmation(data.data.requiresConfirmation || false)
      setInitiated(true)
      setStep('qr')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không thể khởi tạo thanh toán'),
  })

  const { mutate: notifyTransferred, isPending: notifying } = useMutation({
    mutationFn: () => paymentApi.confirm(txnId!),
    onSuccess: ({ data }: any) => {
      if (data.requiresAdminConfirm) {
        setStep('waiting')
        toast.success('✅ Đã ghi nhận! Chờ admin/nhân viên xác nhận...')
      } else {
        setStep('done')
        setTimeout(() => navigate(`/booking-success/${bookingId}`), 1500)
      }
    },
    onError: () => toast.error('Lỗi xác nhận'),
  })

  const booking = bookingData as any
  const loyalty = loyaltyData as any
  const currentMethod = METHODS.find(m => m.id === method)!
  const finalAmount = discount ? discount.finalAmount : booking?.totalAmount

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto">
        <BookingSteps currentStep={3} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 md:p-8 mt-6"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>

          <h2 className="font-display font-bold text-xl mb-6" style={{ color: 'var(--color-text)' }}>💳 Thanh Toán</h2>

          {booking && (
            <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
              <div className="flex justify-between mb-2 text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Phim</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{booking.showtime?.movie?.title}</span>
              </div>
              <div className="flex justify-between mb-2 text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Ghế</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{booking.seatLabels?.join(', ')}</span>
              </div>
              <div className="flex justify-between mb-2 text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Giá gốc</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{fmtPrice(booking.totalAmount)}</span>
              </div>

              {/* Loyalty section */}
              {loyalty && loyalty.points > 0 && step === 'choose' && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4" style={{ color: '#FDE68A' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Dùng điểm tích lũy
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(253,230,138,0.1)', color: '#FDE68A', border: '1px solid rgba(253,230,138,0.2)' }}>
                        {loyalty.points} điểm
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePoints(!usePoints)}
                      className="relative w-10 h-5 rounded-full transition-all"
                      style={{ background: usePoints ? 'var(--color-primary)' : 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: usePoints ? '20px' : '2px' }} />
                    </button>
                  </div>

                  {loyalty.tier !== 'bronze' && (
                    <div className="text-xs mb-2 px-2 py-1 rounded-lg inline-block"
                      style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)' }}>
                      {TIER_LABEL[loyalty.tier]} — giảm thêm {loyalty.tierDiscount * 100}% theo hạng thẻ
                    </div>
                  )}

                  {usePoints && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={loyalty.points}
                          value={pointsToUse}
                          onChange={e => setPointsToUse(Math.min(+e.target.value, loyalty.points))}
                          className="flex-1 px-3 py-2 rounded-xl text-sm"
                          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
                          placeholder={`Nhập số điểm (tối đa ${loyalty.points})`}
                        />
                        <button
                          onClick={handleApplyPoints}
                          disabled={loadingDiscount || pointsToUse <= 0}
                          className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                          {loadingDiscount ? '...' : 'Áp dụng'}
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                        100 điểm = 10.000đ · Tối đa 30% giá trị đơn
                      </p>
                    </div>
                  )}

                  {discount && (
                    <div className="mt-2 p-3 rounded-xl space-y-1" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      {discount.pointsDiscount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--color-text-muted)' }}>Giảm từ điểm ({discount.actualPointsUsed} điểm)</span>
                          <span style={{ color: '#34D399' }}>-{fmtPrice(discount.pointsDiscount)}</span>
                        </div>
                      )}
                      {discount.tierDiscount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--color-text-muted)' }}>Giảm hạng {TIER_LABEL[discount.tierName]} ({discount.tierPercent}%)</span>
                          <span style={{ color: '#34D399' }}>-{fmtPrice(discount.tierDiscount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2 mt-2 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Tổng thanh toán</span>
                <div className="text-right">
                  {discount && discount.finalAmount < booking.totalAmount && (
                    <div className="text-xs line-through" style={{ color: 'var(--color-text-dim)' }}>{fmtPrice(booking.totalAmount)}</div>
                  )}
                  <span className="font-bold text-lg text-gradient-gold">{fmtPrice(finalAmount ?? booking.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm mb-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>Chọn phương thức thanh toán</p>
                <div className="space-y-3 mb-5">
                  {METHODS.map(m => (
                    <motion.button key={m.id} onClick={() => setMethod(m.id)}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                      style={{ background: method === m.id ? `${m.color}15` : 'var(--color-bg-3)', border: `2px solid ${method === m.id ? m.color : 'var(--color-glass-border)'}` }}>
                      <span className="text-2xl">{m.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{m.label}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.desc}</div>
                      </div>
                      {!m.selfConfirm && (
                        <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(253,230,138,0.1)', color: '#FDE68A', border: '1px solid rgba(253,230,138,0.2)' }}>
                          Chờ xác nhận
                        </span>
                      )}
                      {method === m.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: m.color }}>
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {!currentMethod.selfConfirm && (
                  <div className="mb-4 p-3 rounded-xl flex gap-2" style={{ background: 'rgba(253,230,138,0.08)', border: '1px solid rgba(253,230,138,0.2)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FDE68A' }}/>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Chuyển khoản xong → Bấm <b style={{ color: '#FDE68A' }}>"Đã Chuyển Tiền"</b> → Chờ admin/nhân viên xác nhận (5-15 phút)
                    </p>
                  </div>
                )}

                {/* 2 nút cạnh nhau */}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        await bookingApi.cancel(bookingId!)
                      } catch {}
                      navigate(-1)
                    }}
                    className="flex-1 py-4 rounded-2xl text-sm font-medium"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                    ← Chọn ghế khác
                  </button>

                  <motion.button onClick={() => { if (!initiating) initiate() }}
                    disabled={initiating}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.3)' }}>
                    {initiating ? '⏳ Đang tạo...' : `🔐 Tiến Hành Thanh Toán ${finalAmount ? fmtPrice(finalAmount) : ''}`}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 'qr' && qrData && (
              <motion.div key="qr" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-5" style={{ color: '#FDE68A' }}>
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">Quét QR trong 15 phút</span>
                </div>

                {method === 'vietqr' ? (
                  <div className="mb-4">
                    <div className="inline-block rounded-3xl overflow-hidden shadow-2xl mb-3" style={{ maxWidth: 280 }}>
                      <img src={REAL_VIETQR} alt="VietQR" className="w-full object-contain" style={{ maxHeight: 380 }} />
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Quét bằng app ngân hàng bất kỳ</p>
                    <div className="p-2 rounded-xl inline-block text-xs" style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)' }}>
                      Vietcombank · NGUYEN TRAN NHU NGOC · 1036219239
                    </div>
                  </div>
                ) : method === 'bank' ? (
                  <div className="mb-4">
                    <div className="inline-block rounded-3xl overflow-hidden shadow-2xl mb-3" style={{ maxWidth: 280 }}>
                      <img src="/vietqr.jpg" alt="VietQR Vietcombank" className="w-full object-contain" style={{ maxHeight: 380 }} />
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Quét bằng app ngân hàng hoặc chuyển khoản theo thông tin:</p>
                    <div className="p-3 rounded-2xl text-sm text-left mx-auto"
                      style={{ maxWidth: 320, background: 'rgba(253,230,138,0.06)', border: '1px solid rgba(253,230,138,0.25)', lineHeight: 2.2 }}>
                      <div>🏦 <span style={{ color: 'var(--color-text-muted)' }}>Ngân hàng:</span> <b style={{ color: '#FDE68A' }}>Vietcombank</b></div>
                      <div>👤 <span style={{ color: 'var(--color-text-muted)' }}>Chủ TK:</span> <b style={{ color: '#FDE68A' }}>NGUYEN TRAN NHU NGOC</b></div>
                      <div>🔢 <span style={{ color: 'var(--color-text-muted)' }}>Số TK:</span> <b style={{ color: '#FDE68A', fontFamily: 'monospace', fontSize: 16 }}>1036219239</b></div>
                      <div>💬 <span style={{ color: 'var(--color-text-muted)' }}>Nội dung:</span> <b className="font-mono" style={{ color: 'var(--color-primary)' }}>{txnId}</b></div>
                      {booking && <div>💰 <span style={{ color: 'var(--color-text-muted)' }}>Số tiền:</span> <b style={{ color: 'var(--color-primary)' }}>{fmtPrice(finalAmount ?? booking.totalAmount)}</b></div>}
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#F87171' }}>⚠️ Nhập đúng nội dung để được xác nhận nhanh!</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="inline-block rounded-3xl overflow-hidden shadow-2xl mb-3" style={{ maxWidth: 280 }}>
                      <img src={MOMO_QR} alt="MoMo QR" className="w-full object-contain" style={{ maxHeight: 380 }} />
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Quét mã bằng app MoMo → Chuyển tiền → Bấm <b>"Đã Thanh Toán"</b></p>
                    <div className="p-2 rounded-xl inline-block text-xs" style={{ background: 'rgba(174,32,112,0.1)', color: '#AE2070' }}>
                      MoMo · NGUYỄN TRẦN NHƯ NGỌC · *******681
                    </div>
                    {booking && (
                      <div className="mt-2 p-2 rounded-xl text-xs" style={{ background: 'rgba(174,32,112,0.06)', color: 'var(--color-text-muted)' }}>
                        💰 Số tiền: <b style={{ color: '#AE2070' }}>{fmtPrice(finalAmount ?? booking.totalAmount)}</b>
                        {' '}· Nội dung: <b className="font-mono" style={{ color: '#AE2070' }}>{txnId}</b>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-5 p-3 rounded-xl text-xs" style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-text-muted)' }}>
                  Mã GD: <span className="font-mono font-bold" style={{ color: 'var(--color-primary)' }}>{txnId}</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setStep('choose'); setInitiated(false); setQrData(null) }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                    ← Quay lại
                  </button>
                  <motion.button onClick={() => notifyTransferred()} disabled={notifying}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{
                      background: requiresConfirmation ? 'linear-gradient(135deg, #FDE68A, #F59E0B)' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                      color: 'white'
                    }}>
                    {notifying ? '⏳ Đang xử lý...' : '✅ Đã Thanh Toán — Chờ Xác Nhận'}
                  </motion.button>
                </div>

                {requiresConfirmation && (
                  <p className="text-xs mt-3" style={{ color: 'var(--color-text-dim)' }}>
                    Admin/Nhân viên sẽ xác nhận trong 5-15 phút
                  </p>
                )}
              </motion.div>
            )}

            {step === 'waiting' && (
              <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <motion.div className="w-20 h-20 rounded-full border-4 mx-auto mb-5 flex items-center justify-center"
                  style={{ borderColor: 'rgba(168,85,247,0.3)', borderTopColor: 'var(--color-primary)' }}
                  animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                  <RefreshCw className="w-7 h-7" style={{ color: 'var(--color-primary)' }}/>
                </motion.div>
                <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--color-text)' }}>⏳ Đang Chờ Xác Nhận</h3>
                <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Admin/Nhân viên đang kiểm tra giao dịch</p>

                <div className="p-5 rounded-2xl mb-5 text-left" style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Mã giao dịch</div>
                  <div className="font-mono font-bold" style={{ color: 'var(--color-primary)' }}>{txnId}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"/>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Thời gian xử lý: <span style={{ color: '#FDE68A' }}>5 - 15 phút</span></span>
                  </div>
                </div>

                <div className="space-y-3 text-left mb-5">
                  {[
                    { label: 'Khách chuyển khoản', done: true },
                    { label: 'Hệ thống ghi nhận', done: true },
                    { label: 'Admin/Staff xác nhận', done: false, active: true },
                    { label: 'Vé được xác nhận', done: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: s.done ? 'var(--color-primary)' : s.active ? 'rgba(253,230,138,0.2)' : 'var(--color-bg-3)', border: s.active ? '2px solid #FDE68A' : 'none', color: s.done ? 'var(--color-bg)' : s.active ? '#FDE68A' : 'var(--color-text-dim)' }}>
                        {s.done ? '✓' : i + 1}
                      </div>
                      <span className="text-sm" style={{ color: s.done ? 'var(--color-text)' : s.active ? '#FDE68A' : 'var(--color-text-dim)' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Trang tự động cập nhật • Có thể đóng và quay lại sau</p>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} className="text-6xl mb-4">🎉</motion.div>
                <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--color-text)' }}>Thanh toán thành công!</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Đang chuyển đến trang vé...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}