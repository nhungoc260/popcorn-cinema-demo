import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Banknote, CreditCard, Clock, RefreshCw, AlertCircle, Calendar, ChevronRight, BarChart3, TrendingUp, Search, FileText } from 'lucide-react'
import api, { showtimeApi, bookingApi, paymentApi, adminApi } from '../../api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useShowtimeSocket } from '../../hooks/useSocket'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
const fmtPrice = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtM = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`

const SEAT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  standard: { bg: '#1E3A5F', border: 'var(--color-primary)', label: 'Thường' },
  vip:      { bg: '#2D1B4E', border: '#A78BFA',              label: 'VIP'    },
  couple:   { bg: '#1A2E1A', border: '#34D399',              label: 'Đôi'    },
  recliner: { bg: '#3B1A1A', border: '#F97316',              label: 'Recliner' },
}

const TABS = [
  { id: 'sell',     label: '🎬 Bán Vé Tại Quầy', activeColor: 'var(--color-primary)' },
  { id: 'confirm',  label: '💰 Xác Nhận CK',       activeColor: '#FDE68A' },
  { id: 'revenue',  label: '📊 Doanh Thu',          activeColor: '#34D399' },
  { id: 'invoices', label: '🧾 Hóa Đơn',            activeColor: '#60a5fa' },
  { id: 'support', label: '🆘 Hỗ Trợ',             activeColor: '#34D399' },
]

// 7 ngày để chọn suất chiếu (dùng local date tránh lệch timezone UTC vs VN)
const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i)
  return {
    value: toLocalDate(d),
    label: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' })
  }
})

export default function StaffCounter() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<'sell' | 'confirm' | 'revenue' | 'invoices' | 'support'>('sell')

  // ── SELL STATE ──
  const [selDate, setSelDate]         = useState(DATES[0].value)
  const [filterTheater, setFilterTheater] = useState<string>('')
  const [showPast, setShowPast] = useState(false)
  const [filterRoom, setFilterRoom] = useState<string>('')
  const [selMovie, setSelMovie]       = useState<any>(null)
  const [selShowtime, setSelShowtime] = useState<any>(null)
  const [selSeats, setSelSeats]       = useState<any[]>([])
  const [step, setStep]               = useState<'movie' | 'time' | 'seat' | 'pay' | 'done'>('movie')
  const [payMethod, setPayMethod]     = useState<'cash' | 'bank' | 'vietqr' | 'momo'>('cash')
  const [doneBooking, setDoneBooking] = useState<any>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResult, setCustomerResult] = useState<any>(null)
  const [customerLoyalty, setCustomerLoyalty] = useState<any>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [pointsDiscount, setPointsDiscount] = useState(0)
  const [couponCode, setCouponCode]   = useState('')
  const [couponData, setCouponData]   = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [qrData, setQrData]           = useState<string | null>(null)
  const [txnId, setTxnId]             = useState<string | null>(null)
  const [payStep, setPayStep]         = useState<'form' | 'qr'>('form')

  // FIX: localSeats để cập nhật realtime khi có socket event
  const [localSeats, setLocalSeats] = useState<any[]>([])

  // ── FIX: Socket handlers để nhân viên thấy ghế đang giữ realtime ──
  const handleSeatLocked = useCallback(({ seatId, userId: lockUserId }: { seatId: string; userId: string }) => {
    // Không update ghế mình đang chọn (đã được xử lý qua selSeats)
    setLocalSeats(prev =>
      prev.map(s => s._id === seatId && !selSeats.some(sel => sel._id === seatId)
        ? { ...s, status: 'locked', lockedBy: lockUserId }
        : s
      )
    )
  }, [selSeats])

  const handleSeatReleased = useCallback(({ seatId }: { seatId: string }) => {
    setLocalSeats(prev =>
      prev.map(s => s._id === seatId ? { ...s, status: 'available', lockedBy: null } : s)
    )
  }, [])

  const handleSeatBooked = useCallback(({ seatIds }: { seatIds: string[] }) => {
    setLocalSeats(prev =>
      prev.map(s => seatIds.includes(s._id) ? { ...s, status: 'booked', lockedBy: null } : s)
    )
    // Bỏ chọn nếu ghế vừa được đặt bởi người khác
    setSelSeats(prev => prev.filter(s => !seatIds.includes(s._id)))
  }, [])

  const { selectSeat, deselectSeat } = useShowtimeSocket(
    selShowtime?._id || '',
    handleSeatLocked,
    handleSeatReleased,
    handleSeatBooked,
  )

  // ── DATA ──
  const { data: showtimesRaw, isLoading: loadingST } = useQuery({
    queryKey: ['staff-showtimes', selDate],
    queryFn: () => showtimeApi.getAll({ date: selDate }),
    select: d => d.data.data as any[],
  })

  const { data: seatsData, refetch: refetchSeats } = useQuery({
    queryKey: ['staff-seats', selShowtime?._id],
    queryFn: () => showtimeApi.getSeats(selShowtime._id),
    enabled: !!selShowtime,
    select: d => d.data.data as any[],
    refetchInterval: step === 'seat' ? 15000 : false,
    staleTime: 0,
  })

  // Đồng bộ seatsData → localSeats, KHÔNG overwrite ghế đang chọn (selSeats)
  useEffect(() => {
    if (!seatsData) return
    setLocalSeats(prev => {
      // Nếu chưa có local (lần đầu load), set thẳng
      if (prev.length === 0) return seatsData
      // Merge: giữ status của ghế đang chọn bởi nhân viên
      const selIds = new Set(selSeats.map((s: any) => s._id))
      return seatsData.map((s: any) => {
        if (selIds.has(s._id)) return { ...s, status: 'locked', lockedBy: 'me' }
        return s
      })
    })
  }, [seatsData])

  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ['staff-pending'],
    queryFn: () => api.get('/payments/pending'),
    select: d => d.data.data as any[],
    refetchInterval: tab === 'confirm' ? 6000 : false,
  })

  const { data: revenueData } = useQuery({
    queryKey: ['staff-revenue'],
    queryFn: () => api.get('/reports/revenue?period=day'),
    select: d => d.data.data,
    enabled: tab === 'revenue',
  })

  // Group showtimes by movie
  const movieGroups = useMemo(() => {
    const now = Date.now()
    const all: any[] = (showtimesRaw || []).filter(st => {
      if (filterTheater && st.theater?._id !== filterTheater) return false
      if (filterRoom && st.room?._id !== filterRoom) return false
      // Ẩn phim đã kết thúc
      if (st.movie?.status === 'ended') return false
      // Ẩn suất đã kết thúc
      const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
      if (endMs <= now) return false
      return true
    })
    const map: Record<string, { movie: any; showtimes: any[] }> = {}
    all.forEach(st => {
      const mid = st.movie?._id; if (!mid) return
      if (!map[mid]) map[mid] = { movie: st.movie, showtimes: [] }
      map[mid].showtimes.push(st)
    })
    return Object.values(map)
  }, [showtimesRaw, filterTheater, filterRoom])

  const timesForMovie = useMemo(() =>
    (showtimesRaw || []).filter(st =>
      st.movie?._id === selMovie?._id &&
      (!filterTheater || st.theater?._id === filterTheater) &&
      (!filterRoom || st.room?._id === filterRoom)
    )
  , [showtimesRaw, selMovie, filterTheater, filterRoom])

  // Unique theaters từ TẤT CẢ showtimes (dùng cho filter bước chọn phim)
  const allTheaters = useMemo(() => {
    const map: Record<string, any> = {}
    ;(showtimesRaw || []).filter(st => st.theater?._id)
      .forEach(st => { map[st.theater._id] = st.theater })
    return Object.values(map)
  }, [showtimesRaw])

  // Unique theaters từ showtimes của phim đã chọn
  const availableTheaters = useMemo(() => {
    const map: Record<string, any> = {}
    ;(showtimesRaw || [])
      .filter(st => st.movie?._id === selMovie?._id && st.theater?._id)
      .forEach(st => { map[st.theater._id] = st.theater })
    return Object.values(map)
  }, [showtimesRaw, selMovie])

  // Unique rooms từ showtimes đã lọc rạp (dùng cho filter bước chọn phim)
  const availableRoomsForFilter = useMemo(() => {
    const map: Record<string, any> = {}
    ;(showtimesRaw || [])
      .filter(st => !filterTheater || st.theater?._id === filterTheater)
      .filter(st => !selMovie || st.movie?._id === selMovie._id)
      .filter(st => st.room?._id)
      .forEach(st => { map[st.room._id] = st.room })
    return Object.values(map)
  }, [showtimesRaw, filterTheater, selMovie])

  // FIX: Dùng localSeats thay vì seatsData để có realtime updates
  const seats: any[] = localSeats
  const pending: any[] = pendingData || []
  const baseTotal = selSeats.reduce((s, seat) => s + (seat.price || 85000), 0)
  const afterCoupon = couponData ? couponData.finalAmount : baseTotal
  const total = Math.max(0, afterCoupon - pointsDiscount)

  // ── MUTATIONS ──
  const { mutate: sellTicket, isPending: selling } = useMutation({
    mutationFn: async () => {
      // FIX: Deselect tất cả ghế trước (unlock Redis với staffId)
      // để createBooking tự lock lại với đúng userId (staff hoặc customerId)
      // Nếu không làm bước này: backend thấy ghế bị lock bởi staffId ≠ customerId → reject
      for (const seat of selSeats) {
        try { deselectSeat(seat._id) } catch {}
      }
      // Delay nhỏ để socket emit kịp xử lý
      await new Promise(r => setTimeout(r, 200))

      const bookRes = await api.post('/bookings', {
        showtimeId: selShowtime._id,
        seatIds: selSeats.map(s => s._id),
        customerId: customerResult?._id || undefined,
        isCounterSale: true,
      })
      const b = bookRes.data.data
      const initRes = await paymentApi.initiate(b._id, payMethod)
      const txn = initRes.data.data.transactionId
      const qr  = initRes.data.data.qrData || null
      if (payMethod === 'cash') {
        // FIX: Nhân viên thanh toán tiền mặt → admin-confirm ngay
        // Đây sẽ trigger doConfirmPayment: tạo vé, cập nhật ghế, cộng điểm, emit socket
        await api.post('/payments/admin-confirm', { transactionId: txn })
      }
      return { booking: b, transactionId: txn, qrData: qr, requiresConfirm: payMethod !== 'cash' }
    },
    onSuccess: ({ booking, transactionId, qrData: qr, requiresConfirm }) => {
      setDoneBooking({ ...booking, transactionId, requiresConfirm })
      setTxnId(transactionId)
      if (requiresConfirm && qr) { setQrData(qr); setPayStep('qr') }
      else setStep('done')
      // FIX: Refetch revenue và seats sau khi bán thành công
      qc.invalidateQueries({ queryKey: ['staff-revenue'] })
      qc.invalidateQueries({ queryKey: ['staff-seats', selShowtime?._id] })
      toast.success(requiresConfirm ? '📋 Đã tạo vé! Chờ khách chuyển khoản.' : '🎟 Bán vé thành công!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo đơn'),
  })

  const [confirmedPayment, setConfirmedPayment] = useState<any>(null)

  const { mutate: confirmCK, isPending: confirming } = useMutation({
    mutationFn: (p: any) => api.post('/payments/admin-confirm', { paymentId: p._id }).then(res => ({ res, payment: p })),
    onSuccess: ({ payment }) => {
      toast.success('✅ Xác nhận thành công!')
      setConfirmedPayment(payment)
      qc.invalidateQueries({ queryKey: ['staff-pending'] })
      qc.invalidateQueries({ queryKey: ['staff-seats', selShowtime?._id] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  })

  const { mutate: rejectCK } = useMutation({
    mutationFn: (paymentId: string) => api.post('/payments/admin-reject', { paymentId, reason: 'Staff từ chối' }),
    onSuccess: () => { toast.success('Đã từ chối'); qc.invalidateQueries({ queryKey: ['staff-pending'] }) },
  })

  const resetSell = () => {
    setSelMovie(null); setSelShowtime(null); setSelSeats([]); setLocalSeats([])
    setStep('movie'); setPayMethod('cash'); setDoneBooking(null)
    setCouponCode(''); setCouponData(null); setQrData(null); setTxnId(null); setPayStep('form')
    setCustomerQuery(''); setCustomerResult(null); setCustomerLoyalty(null); setPointsDiscount(0)
    setConfirmedPayment(null)
  }

  // Fill đủ 14 ngày gần nhất, ngày không có data = 0
  const revenue = (() => {
    const raw: any[] = (revenueData as any)?.revenue || []
    const rawMap: Record<string, any> = {}
    raw.forEach((r: any) => { rawMap[r._id] = r })
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i))
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      return rawMap[key] || { _id: key, total: 0, count: 0 }
    })
  })()
  const maxRev = Math.max(...revenue.map((r: any) => r.total), 1)

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>🎟 Quầy Vé</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            {user?.name && <> · Nhân viên: <span style={{ color: '#34D399' }}>{user.name}</span></>}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            style={{
              background: tab === t.id ? `${t.activeColor}18` : 'transparent',
              color: tab === t.id ? t.activeColor : 'var(--color-text-muted)',
              border: tab === t.id ? `1.5px solid ${t.activeColor}40` : '1.5px solid transparent',
            }}>
            {t.label}
            {t.id === 'confirm' && pending.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-black"
                style={{ background: '#F87171', color: 'white', minWidth: 18, textAlign: 'center' }}>
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          TAB: BÁN VÉ
      ════════════════════════════════ */}
      {tab === 'sell' && (
        <AnimatePresence mode="wait">

          {/* STEP: Chọn phim */}
          {step === 'movie' && (
            <motion.div key="movie" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {/* Date tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {DATES.map(d => (
                  <button key={d.value} onClick={() => { setSelDate(d.value); setFilterTheater(''); setFilterRoom('') }}
                    className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: selDate === d.value ? 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))' : 'var(--color-bg-2)',
                      color: selDate === d.value ? 'var(--color-bg)' : 'var(--color-text-muted)',
                      border: `1px solid ${selDate === d.value ? 'transparent' : 'var(--color-glass-border)'}`,
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span className="font-semibold text-sm flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                    Chọn phim — {DATES.find(d => d.value === selDate)?.label}
                  </span>
                  {!loadingST && (showtimesRaw?.length || 0) > 0 && (
                    <div className="flex gap-2 ml-auto">
                      <select value={filterTheater} onChange={e => { setFilterTheater(e.target.value); setFilterRoom('') }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                        style={{ background: filterTheater ? 'rgba(168,85,247,0.12)' : 'var(--color-bg-3)', color: filterTheater ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${filterTheater ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
                        <option value="">🏢 Tất cả rạp</option>
                        {allTheaters.map((t: any) => (
                          <option key={t._id} value={t._id}>{t.name?.replace('Popcorn Cinema - ', '') || t.name}</option>
                        ))}
                      </select>
                      <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                        style={{ background: filterRoom ? 'rgba(52,211,153,0.12)' : 'var(--color-bg-3)', color: filterRoom ? '#34D399' : 'var(--color-text-muted)', border: `1px solid ${filterRoom ? '#34D399' : 'var(--color-glass-border)'}` }}>
                        <option value="">🎭 Tất cả phòng</option>
                        {availableRoomsForFilter.map((room: any) => (
                          <option key={room._id} value={room._id}>{room.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {loadingST ? (
                  <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Đang tải suất chiếu...</div>
                ) : movieGroups.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Không có suất chiếu ngày này</div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--color-glass-border)' }}>
                    {movieGroups.map(({ movie, showtimes: sts }) => (
                      <motion.button key={movie._id}
                        whileHover={{ background: 'rgba(34,211,238,0.04)' }}
                        onClick={() => { setSelMovie(movie); setStep('time') }}
                        className="w-full flex items-center gap-4 px-4 py-3 text-left transition-all">
                        <img src={movie.poster} alt="" className="w-12 h-16 object-cover rounded-xl flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{movie.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {movie.duration}p · {movie.genre?.slice(0, 2).join(', ')}
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {(() => {
                              const upcoming = sts.filter((st: any) => {
                                const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
                                return endMs > Date.now()
                              })
                              return <>
                                {upcoming.slice(0, 5).map((st: any) => (
                                  <span key={st._id} className="px-2 py-0.5 rounded-lg text-xs font-bold"
                                    style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                    {fmtTime(st.startTime)}
                                  </span>
                                ))}
                                {upcoming.length > 5 && <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>+{upcoming.length - 5}</span>}
                                {upcoming.length === 0 && <span className="text-xs" style={{ color: '#F87171' }}>Hết suất hôm nay</span>}
                              </>
                            })()}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-dim)' }} />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP: Chọn giờ */}
          {step === 'time' && selMovie && (
            <motion.div key="time" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <button onClick={() => { setSelMovie(null); setStep('movie') }}
                    className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                    ← Phim
                  </button>
                  <img src={selMovie.poster} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{selMovie.title}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{DATES.find(d => d.value === selDate)?.label}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <p className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>Chọn suất chiếu</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Dropdown Rạp */}
                      <select value={filterTheater} onChange={e => { setFilterTheater(e.target.value); setFilterRoom('') }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium outline-none cursor-pointer"
                        style={{ background: 'var(--color-bg-3)', border: `1px solid ${filterTheater ? 'var(--color-primary)' : 'var(--color-glass-border)'}`, color: filterTheater ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        <option value="">🏛 Tất cả rạp</option>
                        {availableTheaters.map((t: any) => (
                          <option key={t._id} value={t._id}>{t.name?.replace('Popcorn Cinema - ', '')}</option>
                        ))}
                      </select>
                      {/* Dropdown Phòng */}
                      <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium outline-none cursor-pointer"
                        style={{ background: 'var(--color-bg-3)', border: `1px solid ${filterRoom ? '#34D399' : 'var(--color-glass-border)'}`, color: filterRoom ? '#34D399' : 'var(--color-text-muted)' }}>
                        <option value="">🎭 Tất cả phòng</option>
                        {availableRoomsForFilter.map((r: any) => (
                          <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                      </select>
                      <button onClick={() => setShowPast(p => !p)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                        style={{
                          background: showPast ? 'rgba(253,230,138,0.12)' : 'var(--color-bg-3)',
                          color: showPast ? '#FDE68A' : 'var(--color-text-dim)',
                          border: `1px solid ${showPast ? 'rgba(253,230,138,0.3)' : 'var(--color-glass-border)'}`,
                        }}>
                        {showPast ? '👁 Ẩn suất cũ' : '📋 Suất đã qua'}
                      </button>
                    </div>
                  </div>
                  {timesForMovie.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Không có suất chiếu</p>
                  ) : (() => {
                    // Nhóm theo giờ chiếu
                    const byTime: Record<string, any[]> = {}
                    timesForMovie.forEach((st: any) => {
                      const timeKey = new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      if (!byTime[timeKey]) byTime[timeKey] = []
                      byTime[timeKey].push(st)
                    })
                    const sortedTimes = Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b))
                    return (
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                        {sortedTimes.flatMap(([timeKey, slots]) => {
                          const allPast = slots.every(st => {
                            const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
                            return endMs < Date.now()
                          })
                          if (allPast && !showPast) return []
                          return slots.map((st: any) => {
                            const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
                            const isPast = endMs < Date.now()
                            const avail = (st.room?.totalSeats || 0) - (st.bookedSeats?.length || 0)
                            const disabled = avail <= 0
                            if (isPast && !showPast) return null
                            const availColor = isPast ? '#6B7280' : disabled ? '#F87171' : avail <= 10 ? '#F97316' : '#34D399'
                            return (
                              <motion.button key={st._id}
                                disabled={disabled || isPast}
                                whileHover={{ scale: disabled || isPast ? 1 : 1.03, y: disabled || isPast ? 0 : -2 }}
                                whileTap={{ scale: disabled || isPast ? 1 : 0.97 }}
                                onClick={() => { if (!disabled && !isPast) { setSelShowtime(st); setStep('seat') } }}
                                className="flex flex-col items-start p-3 rounded-2xl transition-all text-left"
                                style={{
                                  background: isPast ? 'rgba(255,255,255,0.02)' : disabled ? 'rgba(255,255,255,0.03)' : 'rgba(168,85,247,0.07)',
                                  border: `1.5px solid ${isPast ? 'rgba(255,255,255,0.05)' : disabled ? 'rgba(255,255,255,0.08)' : 'rgba(168,85,247,0.35)'}`,
                                  cursor: disabled || isPast ? 'not-allowed' : 'pointer',
                                  opacity: isPast ? 0.45 : 1,
                                  boxShadow: (!isPast && !disabled) ? '0 2px 12px rgba(168,85,247,0.08)' : 'none',
                                }}>
                                <div className="font-black text-lg leading-none mb-2"
                                  style={{ color: isPast ? 'var(--color-text-dim)' : 'var(--color-primary)' }}>
                                  {timeKey}
                                </div>
                                <div className="text-xs font-semibold truncate w-full mb-1"
                                  style={{ color: isPast || disabled ? 'var(--color-text-dim)' : 'var(--color-text)' }}>
                                  {st.room?.name?.replace('Phòng ', 'P.')}
                                </div>
                                <div className="text-xs font-bold" style={{ color: availColor }}>
                                  {isPast ? 'Đã chiếu' : disabled ? 'Hết ghế' : `${avail} ghế còn`}
                                </div>
                              </motion.button>
                            )
                          }).filter(Boolean)
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: Chọn ghế */}
          {step === 'seat' && selShowtime && (
            <motion.div key="seat" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <button onClick={() => { setSelShowtime(null); setSelSeats([]); setStep('time') }}
                    className="text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                    ← Giờ
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>{selShowtime.movie?.title}</div>
                    <div className="text-xs" style={{ color: 'var(--color-primary)' }}>
                      {fmtTime(selShowtime.startTime)} · {selShowtime.room?.name}
                    </div>
                  </div>
                  <button onClick={() => refetchSeats()}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <RefreshCw className="w-3 h-3" /> Làm mới
                  </button>
                </div>

                <div className="p-4">
                  {/* Screen */}
                  <div className="mb-4 text-center">
                    <div className="h-2 rounded-t-full mx-auto mb-1"
                      style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.5),transparent)', maxWidth: 320 }} />
                    <div className="text-xs tracking-[0.3em]" style={{ color: 'var(--color-text-dim)' }}>MÀN HÌNH</div>
                  </div>

                  {/* FIX: Legend cập nhật để bao gồm trạng thái "Đang giữ" */}
                  <div className="flex gap-3 mb-3 flex-wrap">
                    {Object.entries(SEAT_COLORS).map(([type, cfg]) => (
                      <div key={type} className="flex items-center gap-1.5 text-xs">
                        <div className="w-4 h-3.5 rounded" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }} />
                        <span style={{ color: 'var(--color-text-muted)' }}>{cfg.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-4 h-3.5 rounded" style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.7)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>Đang giữ</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-4 h-3.5 rounded" style={{ background: '#2a2a3a', border: '1px solid #374151' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>Đã đặt</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-4 h-3.5 rounded" style={{ background: 'rgba(168,85,247,0.7)', border: '1px solid var(--color-primary)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>Đang chọn</span>
                    </div>
                  </div>

                  {/* FIX: Seat grid với ghế đôi và nút giải phóng ghế bị giữ */}
                  <div className="overflow-x-auto">
                    {(() => {
                      const rows: Record<string, any[]> = {}
                      localSeats.forEach(s => { if (!rows[s.row]) rows[s.row] = []; rows[s.row].push(s) })
                      return Object.entries(rows).sort().map(([row, rowSeats]) => {
                        const sorted = rowSeats.sort((a, b) => a.number - b.number)
                        return (
                          <div key={row} className="flex items-center gap-1 mb-1">
                            <span className="w-5 text-xs text-center flex-shrink-0 font-mono" style={{ color: 'var(--color-text-dim)' }}>{row}</span>
                            {sorted.map((seat, idx) => {
                              const cfg = SEAT_COLORS[seat.type] || SEAT_COLORS.standard
                              const isCouple = seat.type === 'couple'
                              // Skip ô thứ 2 của ghế đôi
                              if (isCouple && idx % 2 === 1 && sorted[idx - 1]?.type === 'couple') return null
                              const partnerSeat = isCouple ? sorted[idx + 1] : null

                              const isBooked = seat.status === 'booked'
                              const isLocked = seat.status === 'locked'
                              const isLockedByOther = isLocked && seat.lockedBy !== user?.id
                              const isSel = selSeats.some(s => s._id === seat._id)
                              const isDisabled = isBooked || isLockedByOther

                              let bgColor = cfg.bg
                              let borderColor = cfg.border
                              let textColor = 'rgba(255,255,255,0.8)'
                              let cursor = 'pointer'
                              let title = `${seat.row}${seat.number}${isCouple && partnerSeat ? `-${partnerSeat.number}` : ''} · ${cfg.label} · ${fmtPrice(seat.price || 85000)}`

                              if (isBooked) {
                                bgColor = '#2a2a3a'; borderColor = '#374151'; textColor = '#555'
                                cursor = 'not-allowed'; title = 'Đã đặt'
                              } else if (isLockedByOther) {
                                bgColor = 'rgba(239,68,68,0.25)'; borderColor = 'rgba(239,68,68,0.7)'; textColor = '#EF4444'
                                cursor = 'not-allowed'; title = 'Ghế đang được giữ — nhấn giữ 2s để giải phóng'
                              } else if (isSel) {
                                bgColor = 'rgba(168,85,247,0.7)'; borderColor = 'var(--color-primary)'; textColor = 'white'
                              }

                              return (
                                <button
                                  key={seat._id}
                                  disabled={isBooked}
                                  title={title}
                                  onClick={() => {
                                    if (isBooked) return
                                    // Nhân viên có thể override ghế đang bị giữ (giải phóng + chọn)
                                    if (isLockedByOther) {
                                      if (!confirm(`Giải phóng ghế ${seat.row}${seat.number}${partnerSeat ? `-${partnerSeat.number}` : ''} đang bị giữ?`)) return
                                      // Emit release qua socket
                                      deselectSeat(seat._id)
                                      if (partnerSeat) deselectSeat(partnerSeat._id)
                                      setLocalSeats(prev => prev.map(s =>
                                        (s._id === seat._id || (partnerSeat && s._id === partnerSeat._id))
                                          ? { ...s, status: 'available', lockedBy: null } : s
                                      ))
                                      return
                                    }
                                    if (isSel) {
                                      setSelSeats(prev => prev.filter(s => s._id !== seat._id && (!partnerSeat || s._id !== partnerSeat._id)))
                                      deselectSeat(seat._id)
                                      if (partnerSeat) deselectSeat(partnerSeat._id)
                                    } else {
                                      setSelSeats(prev => [...prev, seat, ...(partnerSeat ? [partnerSeat] : [])])
                                      selectSeat(seat._id)
                                      if (partnerSeat) selectSeat(partnerSeat._id)
                                    }
                                  }}
                                  className="h-6 rounded text-xs font-bold transition-all flex-shrink-0 flex items-center justify-center relative"
                                  style={{
                                    width: isCouple ? 56 : 28,
                                    background: bgColor,
                                    border: `1px solid ${borderColor}`,
                                    color: textColor,
                                    cursor,
                                    transform: isSel ? 'scale(0.92)' : 'scale(1)',
                                    fontSize: 10,
                                    animation: isLockedByOther ? 'pulse 2s ease-in-out infinite' : undefined,
                                  }}>
                                  {/* Đường kẻ giữa ghế đôi */}
                                  {isCouple && (
                                    <div className="absolute inset-y-1 left-1/2 w-px opacity-30" style={{ background: 'currentColor' }} />
                                  )}
                                  {isCouple && partnerSeat ? `${seat.number}-${partnerSeat.number}` : seat.number}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Summary bar */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    {selSeats.length > 0 ? (
                      <div className="text-sm">
                        <span style={{ color: 'var(--color-text-muted)' }}>Đã chọn: </span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{selSeats.map(s => `${s.row}${s.number}`).join(', ')}</span>
                        <span className="ml-2 font-black" style={{ color: '#FDE68A' }}>{fmtPrice(total)}</span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Chưa chọn ghế nào</span>
                    )}
                    <motion.button onClick={() => setStep('pay')} disabled={selSeats.length === 0}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white' }}>
                      Tiếp tục →
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: Thanh toán */}
          {step === 'pay' && (
            <motion.div key="pay" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-glass-border)' }}>
                  <button onClick={() => { setPayStep('form'); setStep('seat') }}
                    className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                    ← Ghế
                  </button>
                  <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                    {payStep === 'qr' ? '📱 Quét QR Thanh Toán' : 'Thanh Toán'}
                  </h2>
                </div>

                {payStep === 'form' ? (
                <div className="p-4 space-y-4">
                  {/* Order summary */}
                  <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {[
                      { label: 'Phim', val: selShowtime.movie?.title },
                      { label: 'Suất chiếu', val: `${fmtTime(selShowtime.startTime)} · ${fmtDate(selShowtime.startTime)}` },
                      { label: 'Phòng', val: selShowtime.room?.name },
                      { label: 'Ghế', val: selSeats.map(s => `${s.row}${s.number}`).join(', '), color: 'var(--color-primary)' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                        <span style={{ color: color || 'var(--color-text)', fontWeight: color ? 700 : 400 }}>{val}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between" style={{ borderColor: 'var(--color-glass-border)' }}>
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Giá gốc</span>
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{fmtPrice(baseTotal)}</span>
                    </div>
                  </div>

                  {/* Customer lookup - không bắt buộc */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        Tra cứu khách hàng
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-normal"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-dim)' }}>
                          Không bắt buộc
                        </span>
                      </p>
                      {/* Hiển thị khách vãng lai nếu không tìm khách */}
                    {!customerResult && !customerLoading && (
                      <div className="mt-2 p-2 rounded-xl flex items-center gap-2 text-xs"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-glass-border)' }}>
                        <span style={{ color: 'var(--color-text-dim)' }}>👤 Khách vãng lai — vé không gắn tài khoản, không tích điểm</span>
                      </div>
                    )}
                    {customerResult && (
                        <button onClick={() => { setCustomerResult(null); setCustomerLoyalty(null); setCustomerQuery(''); setPointsDiscount(0) }}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                          ✕ Bỏ chọn khách
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                        placeholder="Nhập SĐT hoặc email..."
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                      <button onClick={async () => {
                          if (customerQuery.length < 3) return
                          setCustomerLoading(true)
                          try {
                            const res = await api.get(`/users/search?q=${encodeURIComponent(customerQuery)}`)
                            const users = res.data.data
                            if (users.length === 0) { toast.error('Không tìm thấy khách'); setCustomerResult(null); setCustomerLoyalty(null) }
                            else {
                              const u = users[0]
                              setCustomerResult(u)
                              // FIX: Lấy điểm từ DB, không nhận từ input
                              // FIX: Truyền userId để lấy điểm của khách (không phải staff)
                              // Backend đã được sửa: staff có thể dùng ?userId= để tra điểm khách
                              const lRes = await api.get(`/bookings/loyalty?userId=${u._id}`).catch(() => null)
                              setCustomerLoyalty(lRes?.data?.data || null)
                            }
                          } catch { toast.error('Lỗi tra cứu') }
                          finally { setCustomerLoading(false) }
                        }}
                        disabled={customerLoading || customerQuery.length < 3}
                        className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                        style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.3)' }}>
                        {customerLoading ? '...' : 'Tìm'}
                      </button>
                    </div>
                    {customerResult && (
                      <div className="mt-2 p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{customerResult.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{customerResult.phone} · {customerResult.email}</div>
                          </div>
                          {customerLoyalty && (
                            <div className="text-right">
                              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Điểm tích lũy</div>
                              {/* FIX: Hiển thị điểm từ DB (customerLoyalty từ API) */}
                              <div className="font-black text-lg" style={{ color: 'var(--color-primary)' }}>{customerLoyalty.points}</div>
                              <div className="text-xs" style={{ color: '#FDE68A' }}>{customerLoyalty.tier === 'bronze' ? '🥉 Đồng' : customerLoyalty.tier === 'silver' ? '🥈 Bạc' : customerLoyalty.tier === 'gold' ? '🥇 Vàng' : '💎 Bạch Kim'}</div>
                            </div>
                          )}
                        </div>
                        {customerLoyalty && customerLoyalty.points >= 100 && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Dùng điểm (100đ/điểm)</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={Math.min(customerLoyalty.points, Math.floor(afterCoupon * 0.5 / 100))}
                                  value={pointsDiscount > 0 ? pointsDiscount / 100 : ''}
                                  onChange={e => {
                                    // FIX: Cap theo điểm thực tế từ DB
                                    const pts = Math.min(Number(e.target.value), customerLoyalty.points, Math.floor(afterCoupon * 0.5 / 100))
                                    setPointsDiscount(pts * 100)
                                  }}
                                  placeholder="0"
                                  className="w-20 px-2 py-1 rounded-lg text-xs text-center outline-none"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-text)' }}
                                />
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>điểm = {fmtPrice(pointsDiscount)}</span>
                              </div>
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>
                              Tối đa: {Math.min(customerLoyalty.points, Math.floor(afterCoupon * 0.5 / 100))} điểm (50% đơn hàng)
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Coupon */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Mã giảm giá</p>
                    <div className="flex gap-2">
                      <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Nhập mã giảm giá..."
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                      <button onClick={async () => {
                          if (!couponCode) return
                          setCouponLoading(true)
                          try {
                            const res = await api.post('/coupons/validate', { code: couponCode, amount: baseTotal })
                            setCouponData(res.data.data)
                            toast.success(`Giảm ${fmtPrice(res.data.data.discount)}!`)
                          } catch (e: any) {
                            toast.error(e.response?.data?.message || 'Mã không hợp lệ')
                            setCouponData(null)
                          } finally { setCouponLoading(false) }
                        }}
                        disabled={couponLoading || !couponCode}
                        className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                        style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.3)' }}>
                        {couponLoading ? '...' : 'Áp dụng'}
                      </button>
                    </div>
                    {couponData && (
                      <div className="mt-2 p-2 rounded-xl flex justify-between text-xs"
                        style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                        <span style={{ color: '#34D399' }}>✅ Giảm {fmtPrice(couponData.discount)}</span>
                        <button onClick={() => { setCouponData(null); setCouponCode('') }}
                          style={{ color: '#F87171' }}>✕ Bỏ</button>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center p-3 rounded-xl"
                    style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Tổng thanh toán</span>
                    <span className="font-black text-xl" style={{ color: '#FDE68A' }}>{fmtPrice(total)}</span>
                  </div>

                  {/* Payment method */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Hình thức thanh toán</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash',   icon: <Banknote className="w-5 h-5" />,      label: 'Tiền mặt', note: 'Xác nhận ngay', color: 'var(--color-primary)' },
                        { id: 'vietqr', icon: <CreditCard className="w-5 h-5" />,    label: 'VietQR',   note: 'QR ngân hàng', color: '#FDE68A' },
                        { id: 'momo',   icon: <span className="text-base">📱</span>, label: 'MoMo',     note: 'Quét QR MoMo', color: '#AE2070' },
                      ].map(m => (
                        <button key={m.id} onClick={() => setPayMethod(m.id as any)}
                          className="p-3 rounded-xl text-center transition-all"
                          style={{
                            background: payMethod === m.id ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                            border: `2px solid ${payMethod === m.id ? m.color : 'rgba(255,255,255,0.08)'}`,
                          }}>
                          <div className="flex justify-center mb-1" style={{ color: payMethod === m.id ? m.color : 'rgba(255,255,255,0.3)' }}>{m.icon}</div>
                          <div className="text-xs font-semibold" style={{ color: payMethod === m.id ? m.color : 'var(--color-text)' }}>{m.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-dim)' }}>{m.note}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {payMethod === 'cash' && (
                    <div className="p-3 rounded-xl flex gap-2" style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Tiền mặt → Vé được xác nhận <b style={{ color: 'var(--color-primary)' }}>ngay lập tức</b>. Tự động tạo vé + cộng điểm.
                      </p>
                    </div>
                  )}
                  {payMethod !== 'cash' && (
                    <div className="p-3 rounded-xl flex gap-2" style={{ background: 'rgba(253,230,138,0.07)', border: '1px solid rgba(253,230,138,0.2)' }}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FDE68A' }} />
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Tạo đơn → Hiện QR cho khách quét → Xác nhận trong tab <b style={{ color: '#FDE68A' }}>"Xác Nhận CK"</b>
                      </p>
                    </div>
                  )}

                  <motion.button onClick={() => sellTicket()} disabled={selling}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.35)' }}>
                    {selling ? '⏳ Đang xử lý...' : `💳 Xác Nhận Bán — ${fmtPrice(total)}`}
                  </motion.button>
                </div>
                ) : (
                /* QR Step */
                <div className="p-4 space-y-4 text-center">
                  <p className="text-xs font-semibold" style={{ color: '#FDE68A' }}>📱 Cho khách quét QR để thanh toán</p>
                  {payMethod === 'vietqr' && (
                    <div>
                      <div className="inline-block rounded-2xl overflow-hidden mb-3" style={{ maxWidth: 240 }}>
                        <img src="/vietqr.jpg" alt="VietQR" className="w-full object-contain" />
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Quét bằng app ngân hàng bất kỳ</p>
                      <div className="mt-2 p-2 rounded-xl text-xs inline-block" style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)' }}>
                        Vietcombank · 1036219239
                      </div>
                    </div>
                  )}
                  {payMethod === 'momo' && (
                    <div>
                      <div className="inline-block rounded-2xl overflow-hidden mb-3" style={{ maxWidth: 240 }}>
                        <img src="/momo-qr.png" alt="MoMo QR" className="w-full object-contain" />
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Quét bằng app MoMo</p>
                      <div className="mt-2 p-2 rounded-xl text-xs inline-block" style={{ background: 'rgba(174,32,112,0.1)', color: '#AE2070' }}>
                        MoMo · NGUYỄN TRẦN NHƯ NGỌC · *******681
                      </div>
                    </div>
                  )}
                  <div className="p-3 rounded-xl text-left space-y-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-muted)' }}>Số tiền</span>
                      <span className="font-black" style={{ color: '#FDE68A' }}>{fmtPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-muted)' }}>Mã GD</span>
                      <span className="font-mono font-bold" style={{ color: 'var(--color-primary)' }}>{txnId}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setPayStep('form')}
                      className="flex-1 py-3 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                      ← Quay lại
                    </button>
                    <button onClick={() => { setStep('done') }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg,#FDE68A,#F59E0B)', color: '#1a1a1a' }}>
                      ✅ Khách đã quét xong
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Sau khi khách quét, vào tab Xác Nhận CK để duyệt</p>
                </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP: Done */}
          {step === 'done' && doneBooking && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center p-8 rounded-2xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <div className="text-5xl mb-3">{doneBooking.requiresConfirm ? '⏳' : '🎉'}</div>
              <h3 className="font-black text-xl mb-1" style={{ color: 'var(--color-text)' }}>
                {doneBooking.requiresConfirm ? 'Chờ khách chuyển khoản' : 'Bán vé thành công!'}
              </h3>
              {doneBooking.requiresConfirm && (
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Sau khi khách chuyển xong, chuyển qua tab <span style={{ color: '#FDE68A' }}>Xác Nhận CK</span>
                </p>
              )}
              <div className="p-4 rounded-xl mb-4 text-left" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Mã vé</div>
                <div className="font-mono font-black text-xl" style={{ color: 'var(--color-primary)' }}>{doneBooking.bookingCode}</div>
                <div className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Ghế: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{doneBooking.seatLabels?.join(', ')}</span>
                </div>
              </div>

              {/* QR code để khách quét vào rạp — chỉ hiện khi đã thanh toán xong */}
              {!doneBooking.requiresConfirm && doneBooking.qrCode && (
                <div className="mb-5">
                  <p className="text-xs mb-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    📱 Cho khách quét QR vào rạp
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={doneBooking.qrCode}
                      alt="QR vé"
                      className="w-48 h-48 rounded-xl"
                      style={{ background: 'white', padding: 8 }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const win = window.open('', '_blank')
                      if (!win) return
                      win.document.write(`
                        <html><head><title>Vé - ${doneBooking.bookingCode}</title>
                        <style>
                          body { font-family: sans-serif; text-align: center; padding: 20px; }
                          h2 { color: #7c3aed; }
                          img { width: 200px; height: 200px; }
                          .info { margin: 10px 0; font-size: 14px; }
                          .code { font-family: monospace; font-size: 20px; font-weight: bold; color: #7c3aed; }
                        </style></head>
                        <body onload="window.print()">
                          <h2>🎬 POPCORN CINEMA</h2>
                          <img src="${doneBooking.qrCode}" />
                          <div class="code">${doneBooking.bookingCode}</div>
                          <div class="info">Ghế: <b>${doneBooking.seatLabels?.join(', ')}</b></div>
                          <div class="info" style="color:#888;font-size:12px">Xuất trình mã này khi vào rạp</div>
                        </body></html>
                      `)
                      win.document.close()
                    }}
                    className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                  >
                    🖨️ In vé
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={resetSell}
                  className="flex-1 py-3 rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white' }}>
                  🎟 Bán vé khác
                </button>
                {doneBooking.requiresConfirm && (
                  <button onClick={() => { resetSell(); setTab('confirm') }}
                    className="flex-1 py-3 rounded-xl font-bold"
                    style={{ background: 'rgba(253,230,138,0.12)', color: '#FDE68A', border: '1px solid rgba(253,230,138,0.3)' }}>
                    💰 Xác nhận CK
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ════════════════════════════════
          TAB: XÁC NHẬN CK
      ════════════════════════════════ */}
      {tab === 'confirm' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Giao dịch chờ xác nhận
              {pending.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                  {pending.length}
                </span>
              )}
            </div>
            <button onClick={() => refetchPending()} className="p-1.5 rounded-lg flex items-center gap-1 text-xs"
              style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> Cập nhật
            </button>
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <CheckCircle className="w-10 h-10 mb-3" style={{ color: '#34D399' }} />
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Không có giao dịch chờ</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Tự động cập nhật mỗi 6 giây</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((p: any) => (
                <motion.div key={p._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl"
                  style={{
                    background: 'var(--color-bg-2)',
                    border: `1px solid ${p.status === 'customer_confirmed' ? 'rgba(168,85,247,0.35)' : 'var(--color-glass-border)'}`,
                  }}>
                  {p.status === 'customer_confirmed' && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>🔔 Khách vừa xác nhận đã chuyển</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Khách: </span>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{p.user?.name}</span></div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Phim: </span>
                        <span style={{ color: 'var(--color-text)' }}>{p.booking?.showtime?.movie?.title}</span></div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Số tiền: </span>
                        <span className="font-bold text-sm" style={{ color: '#FDE68A' }}>{fmtPrice(p.amount)}</span></div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>PT: </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{p.method === 'bank' ? 'Chuyển khoản' : 'VietQR'}</span></div>
                      <div className="font-mono" style={{ color: 'var(--color-primary)' }}>{p.transactionId}</div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => confirmCK(p)} disabled={confirming}
                        className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white', boxShadow: '0 2px 8px rgba(168,85,247,0.3)' }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Xác nhận
                      </button>
                      <button onClick={() => rejectCK(p._id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                        style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                        ✕ Từ chối
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ════════════════════════════════
          TAB: DOANH THU
      ════════════════════════════════ */}
      {tab === 'revenue' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tổng doanh thu', val: fmtPrice((revenueData as any)?.summary?.totalRevenue || 0), color: 'var(--color-primary)', icon: '💰' },
              { label: 'Giao dịch',      val: (revenueData as any)?.summary?.totalTransactions || 0,       color: '#FDE68A', icon: '🎫' },
              { label: 'KH mới tháng',  val: (revenueData as any)?.newUsersThisMonth || 0,                color: '#F472B6', icon: '👤' },
              { label: 'Đang chờ CK',   val: pending.length,                                              color: '#F97316', icon: '⏳' },
            ].map(({ label, val, color, icon }) => (
              <div key={label} className="p-4 rounded-2xl"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="text-lg mb-1">{icon}</div>
                <div className="font-black text-xl" style={{ color }}>{val}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Doanh thu theo ngày</h3>
            </div>
            {revenue.every((r: any) => r.total === 0) ? (
              <div className="h-32 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                Chưa có dữ liệu
              </div>
            ) : (
              <>
                <div className="relative flex items-end gap-1.5" style={{ height: 128 }}>
                  {revenue.slice(-14).map((r: any, i: number) => {
                    const px = Math.max((r.total / maxRev) * 128, r.total > 0 ? 4 : 0)
                    return (
                      <div key={i} className="flex-1 group relative cursor-default" style={{ height: 128 }}>
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 z-10 pointer-events-none whitespace-nowrap text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'var(--color-bg)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)' }}>
                          {fmtM(r.total)}đ · {r.count} vé
                        </div>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: px }}
                          transition={{ duration: 0.5, delay: i * 0.03 }}
                          className="w-full rounded-t-lg absolute bottom-0"
                          style={{ background: r.total === maxRev ? 'linear-gradient(180deg,var(--color-primary),var(--color-primary-dark))' : 'rgba(168,85,247,0.35)' }} />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {revenue.slice(-14).filter((_: any, i: number) => i % 3 === 0).map((r: any, i: number) => (
                    <span key={i} className="text-xs" style={{ color: 'var(--color-text-dim)', fontSize: 10 }}>{r._id?.slice(5)}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {(revenueData as any)?.topMovies?.length > 0 && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <BarChart3 className="w-4 h-4" style={{ color: '#FDE68A' }} /> Top phim doanh thu
              </h3>
              <div className="space-y-3">
                {(revenueData as any).topMovies.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 text-center text-xs font-black"
                      style={{ color: i === 0 ? '#FDE68A' : 'var(--color-text-dim)' }}>{i + 1}</div>
                    {m.poster && <img src={m.poster} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                      <div className="mt-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${(m.revenue / ((revenueData as any).topMovies[0]?.revenue || 1)) * 100}%`,
                          background: 'linear-gradient(90deg,var(--color-primary),#FDE68A)'
                        }} />
                      </div>
                    </div>
                    <div className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-primary)' }}>{fmtM(m.revenue)}đ</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── INVOICES TAB ── */}
      {tab === 'invoices' && (
        <InvoicesTab />
      )}
      {tab === 'support' && <SupportTab />}
      {/* ── Modal QR sau khi xác nhận CK ── */}
      {confirmedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden text-center p-6"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-black text-lg mb-1" style={{ color: 'var(--color-text)' }}>Thanh toán xác nhận!</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Cho khách quét QR này để vào rạp</p>

            {/* QR từ booking */}
            {confirmedPayment.booking?.qrCode ? (
              <div className="flex justify-center mb-4">
                <img src={confirmedPayment.booking.qrCode} alt="QR vé"
                  className="w-48 h-48 rounded-xl" style={{ background: 'white', padding: 8 }} />
              </div>
            ) : (
              <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="font-mono font-black text-xl" style={{ color: 'var(--color-primary)' }}>
                  {confirmedPayment.booking?.bookingCode}
                </div>
              </div>
            )}

            <div className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Ghế: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                {confirmedPayment.booking?.seatLabels?.join(', ')}
              </span>
            </div>

            <div className="flex gap-2">
              {confirmedPayment.booking?.qrCode && (
                <button
                  onClick={() => {
                    const win = window.open('', '_blank')
                    if (!win) return
                    win.document.write(`
                      <html><head><title>Vé - ${confirmedPayment.booking?.bookingCode}</title>
                      <style>
                        body { font-family: sans-serif; text-align: center; padding: 20px; }
                        h2 { color: #7c3aed; } img { width: 200px; height: 200px; }
                        .code { font-family: monospace; font-size: 20px; font-weight: bold; color: #7c3aed; }
                        .info { margin: 8px 0; font-size: 14px; }
                      </style></head>
                      <body onload="window.print()">
                        <h2>🎬 POPCORN CINEMA</h2>
                        <img src="${confirmedPayment.booking?.qrCode}" />
                        <div class="code">${confirmedPayment.booking?.bookingCode}</div>
                        <div class="info">Ghế: <b>${confirmedPayment.booking?.seatLabels?.join(', ')}</b></div>
                        <div class="info" style="color:#888;font-size:12px">Xuất trình mã này khi vào rạp</div>
                      </body></html>
                    `)
                    win.document.close()
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  🖨️ In vé
                </button>
              )}
              <button onClick={() => setConfirmedPayment(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white' }}>
                ✓ Xong
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// ── Invoices Tab Component ──
function InvoicesTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [refundReason, setRefundReason] = useState('')
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestReason, setRequestReason] = useState('')

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    success:              { label: 'Thành công',    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
    pending:              { label: 'Chờ xử lý',     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    pending_confirmation: { label: 'Chờ xác nhận',  color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
    customer_confirmed:   { label: 'KH xác nhận',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
    failed:               { label: 'Thất bại',       color: '#f43f5e', bg: 'rgba(244,63,94,0.1)'   },
    refunded:             { label: 'Đã hoàn tiền',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  }
  const METHOD_CFG: Record<string, { label: string; icon: string }> = {
    cash: { label: 'Tiền mặt', icon: '💵' }, bank: { label: 'CK', icon: '💳' },
    vietqr: { label: 'VietQR', icon: '🏦' }, momo: { label: 'MoMo', icon: '📱' },
  }

  const { mutate: doRefund, isPending: refunding } = useMutation({
    mutationFn: () => api.post(`/bookings/${selected?.booking?._id}/refund`, { reason: refundReason }),
    onSuccess: (res) => {
      toast.success(res.data.message || '✅ Hoàn vé thành công!')
      setSelected(null); setShowRefundForm(false); setRefundReason('')
      qc.invalidateQueries({ queryKey: ['staff-invoices'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không thể hoàn vé'),
  })

  const { mutate: doRequestRefund, isPending: requesting } = useMutation({
    mutationFn: () => api.post(`/bookings/${selected?.booking?._id}/request-refund`, { reason: requestReason }),
    onSuccess: (res) => {
      toast.success(res.data.message || '📋 Đã gửi yêu cầu lên Admin!')
      setSelected(null); setShowRequestForm(false); setRequestReason('')
      qc.invalidateQueries({ queryKey: ['staff-invoices'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Không thể gửi yêu cầu'),
  })

  const canRefund = (inv: any) => {
    if (inv?.status !== 'success') return false
    if (inv?.booking?.status === 'checked_in' || inv?.booking?.status === 'cancelled') return false
    if ((inv?.amount || 0) > 500000) return false
    const startTime = inv?.booking?.showtime?.startTime
    if (!startTime) return false
    return (new Date(startTime).getTime() - Date.now()) / (1000 * 60 * 60) >= 2
  }

  const { data, isLoading } = useQuery({
    queryKey: ['staff-invoices', page, search, statusFilter],
    queryFn: () => adminApi.getInvoices({ page, limit: 15, search, status: statusFilter || undefined }),
    select: d => d.data,
  })
  const result = data as any
  const invoices: any[] = result?.data || []
  const total = result?.pagination?.total || 0
  const totalPages = Math.ceil(total / 15)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
            placeholder="Tìm mã vé, tên khách..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
          <button onClick={() => { setSearch(searchInput); setPage(1) }}
            className="px-3 py-2 rounded-xl"
            style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
            <Search size={14} />
          </button>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <option value="">Tất cả</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
        {isLoading ? (
          <div className="p-4 space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl skeleton" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Không có hóa đơn</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-glass-border)' }}>
            {invoices.map((inv: any) => {
              const st = STATUS_CFG[inv.status] || STATUS_CFG.pending
              const mt = METHOD_CFG[inv.method] || { icon: '💰', label: inv.method }
              return (
                <div key={inv._id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setSelected(inv)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                        {inv.booking?.bookingCode || '—'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {inv.user?.name || 'Khách vãng lai'} · {inv.booking?.showtime?.movie?.title || '—'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold" style={{ color: '#fde68a' }}>{inv.amount?.toLocaleString('vi-VN')}đ</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{mt.icon} {mt.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
            ← Trước
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
            Sau →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>🧾 Chi tiết hóa đơn</h3>
              <button onClick={() => setSelected(null)} style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: 'Mã GD',     value: selected.transactionId },
                { label: 'Mã vé',     value: selected.booking?.bookingCode },
                { label: 'Khách',     value: selected.user?.name || 'Khách vãng lai' },
                { label: 'Phim',      value: selected.booking?.showtime?.movie?.title || '—' },
                { label: 'Ghế',       value: selected.booking?.seatLabels?.join(', ') || '—' },
                { label: 'Số tiền',   value: `${selected.amount?.toLocaleString('vi-VN')}đ` },
                { label: 'PT TT',     value: `${METHOD_CFG[selected.method]?.icon} ${METHOD_CFG[selected.method]?.label}` },
                { label: 'Trạng thái', value: STATUS_CFG[selected.status]?.label },
                ...(selected.soldBy ? [{ label: 'NV bán', value: selected.soldBy?.name }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg-3)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
                </div>
              ))}

              {/* Hoàn tiền */}
              {canRefund(selected) && !showRefundForm && (
                <button onClick={() => setShowRefundForm(true)}
                  className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
                  💸 Hoàn tiền cho khách
                </button>
              )}

              {/* Form nhập lý do hoàn */}
              {showRefundForm && (
                <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>💸 Xác nhận hoàn tiền</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Số tiền hoàn: <strong style={{ color: '#fde68a' }}>{selected.amount?.toLocaleString('vi-VN')}đ</strong>
                  </p>

                  {/* Lý do nhanh */}
                  <div className="flex gap-1.5 flex-wrap">
                    {['Khách bệnh đột xuất', 'Sự cố gia đình', 'Lỗi đặt nhầm suất', 'Lý do khác'].map(r => (
                      <button key={r} onClick={() => setRefundReason(r)}
                        className="px-2 py-1 rounded-lg text-xs transition-all"
                        style={{
                          background: refundReason === r ? 'rgba(167,139,250,0.25)' : 'var(--color-bg-3)',
                          color: refundReason === r ? '#a78bfa' : 'var(--color-text-muted)',
                          border: `1px solid ${refundReason === r ? 'rgba(167,139,250,0.4)' : 'var(--color-glass-border)'}`,
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>

                  <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
                    placeholder="Nhập lý do hoàn tiền (bắt buộc)..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />

                  <div className="flex gap-2">
                    <button onClick={() => { setShowRefundForm(false); setRefundReason('') }}
                      className="flex-1 py-2 rounded-lg text-xs"
                      style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                      Huỷ
                    </button>
                    <button onClick={() => doRefund()} disabled={refunding || refundReason.trim().length < 5}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
                      style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' }}>
                      {refunding ? 'Đang xử lý...' : '✓ Xác nhận hoàn'}
                    </button>
                  </div>
                </div>
              )}

              {/* Thông báo nếu không đủ điều kiện hoàn */}
              {selected.status === 'success' && !canRefund(selected) && selected.booking?.status !== 'cancelled' && (
                <div className="mt-2 space-y-2">
                  <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                    ⚠️ {(selected.amount || 0) > 500000
                      ? 'Vé trên 500.000đ — cần Admin duyệt'
                      : 'Suất chiếu trong vòng 2 tiếng hoặc đã kết thúc — cần Admin duyệt'}
                  </div>

                  {/* Đã có yêu cầu pending */}
                  {selected.metadata?.refundRequest?.status === 'pending' ? (
                    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                      📋 Đã gửi yêu cầu hoàn tiền — đang chờ Admin duyệt
                    </div>
                  ) : !showRequestForm ? (
                    <button onClick={() => setShowRequestForm(true)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      📋 Gửi yêu cầu hoàn tiền lên Admin
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>📋 Yêu cầu hoàn tiền</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {['Khách bệnh đột xuất', 'Sự cố gia đình', 'Lỗi đặt nhầm', 'Khách yêu cầu đặc biệt'].map(r => (
                          <button key={r} onClick={() => setRequestReason(r)}
                            className="px-2 py-1 rounded-lg text-xs transition-all"
                            style={{
                              background: requestReason === r ? 'rgba(251,191,36,0.2)' : 'var(--color-bg-3)',
                              color: requestReason === r ? '#fbbf24' : 'var(--color-text-muted)',
                              border: `1px solid ${requestReason === r ? 'rgba(251,191,36,0.4)' : 'var(--color-glass-border)'}`,
                            }}>
                            {r}
                          </button>
                        ))}
                      </div>
                      <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)}
                        placeholder="Mô tả lý do cần hoàn tiền..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                      <div className="flex gap-2">
                        <button onClick={() => { setShowRequestForm(false); setRequestReason('') }}
                          className="flex-1 py-2 rounded-lg text-xs"
                          style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                          Huỷ
                        </button>
                        <button onClick={() => doRequestRefund()} disabled={requesting || requestReason.trim().length < 5}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                          style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                          {requesting ? 'Đang gửi...' : '✓ Gửi yêu cầu'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
function SupportTab() {
  const qc = useQueryClient()
  const [note, setNote] = useState<Record<string, string>>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => api.get('/support/tickets', {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    }),
    select: d => d.data.data as any[],
    refetchInterval: 1000,
    staleTime: 0,
    gcTime: 0,
  })

  const { mutate: updateTicket } = useMutation({
    mutationFn: ({ id, status, n }: any) =>
      api.patch(`/support/tickets/${id}`, { status, note: n }),
    onSuccess: () => {
      toast.success('Đã cập nhật!')
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })

  const tickets = data || []

  const STATUS_COLOR: Record<string, string> = {
    pending: '#f97316',
    in_progress: '#60a5fa',
    resolved: '#34d399',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Yêu cầu hỗ trợ từ chatbot
          {tickets.filter((t: any) => t.status === 'pending').length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
              {tickets.filter((t: any) => t.status === 'pending').length} chờ xử lý
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg flex items-center gap-1 text-xs"
          style={{ border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Đang tải...</div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <span className="text-4xl mb-3">💬</span>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Chưa có yêu cầu nào</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Tự động cập nhật mỗi 15 giây</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: any) => (
            <div key={t.id} className="p-4 rounded-2xl"
              style={{ background: 'var(--color-bg-2)', border: `1px solid ${t.status === 'pending' ? 'rgba(249,115,22,0.3)' : 'var(--color-glass-border)'}` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: '#34d399' }}>{t.id}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${STATUS_COLOR[t.status]}20`, color: STATUS_COLOR[t.status] }}>
                      {t.status === 'pending' ? 'Chờ xử lý' : t.status === 'in_progress' ? 'Đang xử lý' : 'Đã xử lý'}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {t.userName} · {new Date(t.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <p className="text-sm mb-3 p-3 rounded-xl"
                style={{ color: 'var(--color-text)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-glass-border)' }}>
                {t.message}
              </p>

              {t.status !== 'resolved' && (
                <div className="space-y-2">
                  <textarea
                    value={note[t.id] ?? t.note}
                    onChange={e => setNote(prev => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Ghi chú xử lý..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => updateTicket({ id: t.id, status: 'in_progress', n: note[t.id] || t.note })}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                      🔄 Đang xử lý
                    </button>
                    <button onClick={() => updateTicket({ id: t.id, status: 'resolved', n: note[t.id] || t.note })}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                      ✅ Đã xử lý
                    </button>
                  </div>
                </div>
              )}

              {t.status === 'resolved' && t.note && (
                <p className="text-xs p-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
                  ✅ {t.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}