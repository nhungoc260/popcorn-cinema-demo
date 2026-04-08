import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Zap, Calendar, Star, Film, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

export default function AdminSmartSchedule() {
  const [movieIds, setMovieIds] = useState<string[]>([])
  const [theaterId, setTheaterId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [rooms, setRooms] = useState<any[]>([])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0] })
  const [priceStandard, setPriceStandard] = useState(80000)
  const [priceVip, setPriceVip] = useState(120000)
  const [priceDouble, setPriceDouble] = useState(180000)
  const [priceRecliner, setPriceRecliner] = useState(150000)
  const [result, setResult] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['08:00','10:00','13:30','15:00','17:30','19:30','21:00'])
  const [newSlot, setNewSlot] = useState('')
  const [showConflictWarning, setShowConflictWarning] = useState(false)

  const { data: moviesData } = useQuery({ queryKey: ['movies-admin'], queryFn: () => api.get('/movies?limit=100'), select: d => d.data.data })
  const { data: theatersData } = useQuery({ queryKey: ['theaters-admin'], queryFn: () => api.get('/admin/theaters'), select: d => d.data.data })

  // Chỉ cho phép tạo suất chiếu với phim đang chiếu hoặc sắp chiếu
  const movies: any[] = ((moviesData as any[]) || []).filter(
    (m: any) => m.status === 'now_showing' || m.status === 'coming_soon'
  )
  const filteredMovies = filterStatus ? movies.filter((m: any) => m.status === filterStatus) : movies
  const theaters: any[] = (theatersData as any[]) || []

  // Conflict risk detection
  const goldenSlots = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 14 && h <= 21 })
  const conflictRiskLevel: 'high' | 'medium' | 'low' = 
    movieIds.length > 1 && roomId !== '' ? 'high' :
    movieIds.length > 1 && goldenSlots.length >= Math.ceil(selectedSlots.length * 0.7) ? 'medium' : 'low'

  const loadRooms = async (tid: string) => {
    setTheaterId(tid); setRoomId('')
    if (!tid) { setRooms([]); return }
    try {
      const { data } = await api.get(`/admin/rooms?theaterId=${tid}`)
      setRooms(data.data || [])
    } catch { setRooms([]) }
  }

  const { mutate: generate, isPending } = useMutation({
    mutationFn: async () => {
      // ✅ Gửi tất cả phim 1 lần — backend xử lý round-robin
      const { data } = await api.post('/admin/showtimes/auto-generate', {
        movieIds,
        theaterId,
        roomId: roomId || undefined,
        startDate, endDate,
        priceStandard, priceVip, priceDouble, priceRecliner,
        timeSlots: selectedSlots.map(s => { const [h, m] = s.split(':'); return +h + (+m) / 60 }),
      })
      return data
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(data.message)
      // Hiển thị breakdown từng phim
      if (data.data?.breakdown) {
        data.data.breakdown.forEach((b: any) => {
          toast(`🎬 ${b.title}: ${b.generated} suất`, { duration: 3000 })
        })
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo suất chiếu'),
  })


  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="border-b border-b px-6 py-4 flex items-center gap-3"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <Link to="/admin"><ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} /></Link>
        <Zap className="w-5 h-5" style={{ color: '#FDE68A' }} />
        <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Smart Scheduling — Tạo Suất Chiếu Tự Động</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-2 gap-8">

        {/* LEFT: Config */}
        <div className="space-y-5">
          <div className="p-6 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Film className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> Cấu hình
            </h2>
            <div className="space-y-4">
              {/* Movies multi-select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Phim * <span style={{ color: 'var(--color-primary)' }}>({movieIds.length} đã chọn)</span></label>
                  <button onClick={() => setMovieIds(movieIds.length === filteredMovies.length ? [] : filteredMovies.map((m: any) => m._id))}
                    className="text-xs px-2 py-0.5 rounded-lg"
                    style={{ color: 'var(--color-primary)', background: 'rgba(168,85,247,0.1)' }}>
                    {movieIds.length === filteredMovies.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                {/* Note giải thích */}
                <p className="text-xs mb-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
                  💡 Chỉ hiện phim <strong>Đang chiếu</strong> và <strong>Sắp chiếu</strong> — phim đã kết thúc hoặc ngưng chiếu không thể tạo suất mới
                </p>
                {/* Status filter pills */}
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {[
                    { value: '', label: 'Tất cả', color: 'var(--color-primary)' },
                    { value: 'now_showing', label: '🟢 Đang chiếu', color: '#34D399' },
                    { value: 'coming_soon', label: '🔵 Sắp chiếu', color: '#60A5FA' },
                  ].map(({ value, label, color }) => (
                    <button key={value} onClick={() => setFilterStatus(value)}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                      style={{
                        background: filterStatus === value ? `${color}20` : 'var(--color-bg-3)',
                        border: `1px solid ${filterStatus === value ? color : 'var(--color-glass-border)'}`,
                        color: filterStatus === value ? color : 'var(--color-text-muted)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {filteredMovies.map((m: any) => {
                    const checked = movieIds.includes(m._id)
                    return (
                      <div key={m._id}
                        onClick={() => setMovieIds(checked ? movieIds.filter(id => id !== m._id) : [...movieIds, m._id])}
                        className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all"
                        style={{ background: checked ? 'rgba(168,85,247,0.1)' : 'var(--color-bg-3)', border: `1px solid ${checked ? 'rgba(168,85,247,0.4)' : 'var(--color-glass-border)'}` }}>
                        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: checked ? 'var(--color-primary)' : 'transparent', border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
                          {checked && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <img src={m.poster} alt="" className="w-6 h-8 object-cover rounded flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                          <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                            {m.duration}p · ⭐{m.rating}
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{
                              background: m.status === 'now_showing' ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)',
                              color: m.status === 'now_showing' ? '#34D399' : '#60A5FA',
                            }}>
                              {m.status === 'now_showing' ? 'Đang chiếu' : 'Sắp chiếu'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Theater */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Rạp chiếu *</label>
                <select value={theaterId} onChange={e => loadRooms(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
                  <option value="">-- Chọn rạp --</option>
                  {theaters.map((t: any) => <option key={t._id} value={t._id}>{t.name} - {t.city}</option>)}
                </select>
              </div>

              {/* Room */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Phòng chiếu <span style={{ color: 'var(--color-text-dim)' }}>(tuỳ chọn)</span></label>
                <select value={roomId} onChange={e => {
                    const rid = e.target.value
                    setRoomId(rid)
                    if (rid) {
                      const room = rooms.find((r: any) => r._id === rid)
                      if (room?.prices) {
                        if (room.prices.standard) setPriceStandard(room.prices.standard)
                        if (room.prices.vip)      setPriceVip(room.prices.vip)
                        if (room.prices.couple)   setPriceDouble(room.prices.couple)
                        if (room.prices.recliner) setPriceRecliner(room.prices.recliner)
                      }
                    }
                  }}
                  disabled={!theaterId}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
                  <option value="">-- Tự động chọn phòng trống --</option>
                  {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.name} ({r.totalSeats} ghế · {r.type?.toUpperCase()})</option>)}
                </select>
                {theaterId && rooms.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: '#F43F5E' }}>⚠️ Rạp này chưa có phòng</p>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Từ ngày', val: startDate, set: setStartDate }, { label: 'Đến ngày', val: endDate, set: setEndDate }].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                    <input type="date" value={val} onChange={e => set(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div>
                {/* ⚡ GỢI Ý NHANH — 3 cột nổi bật */}
                <div className="mb-3 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(253,230,138,0.3)' }}>
                  <div className="px-4 py-2 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, rgba(253,230,138,0.12), rgba(245,158,11,0.06))' }}>
                    <span className="text-sm">⚡</span>
                    <span className="text-xs font-bold" style={{ color: '#FDE68A' }}>Gợi ý khung giờ chuẩn rạp Việt Nam</span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--color-text-dim)' }}>Click để áp dụng</span>
                  </div>
                  <div className="grid grid-cols-3" style={{ borderTop: '1px solid rgba(253,230,138,0.15)' }}>
                    {([
                      { label: '📅 Ngày thường', sublabel: 'T2–T5', count: '6 suất', slots: ['08:00','10:30','13:00','15:30','18:00','20:30'], color: '#60A5FA', hours: '8h → 20h30', desc: 'Tập trung tối' },
                      { label: '🎉 Cuối tuần', sublabel: 'T6–CN', count: '9 suất', slots: ['07:30','09:30','11:30','13:30','15:30','17:30','19:30','21:30','23:00'], color: '#A855F7', hours: '7h30 → 23h', desc: 'Trải đều + khuya' },
                      { label: '🌟 Bom tấn', sublabel: 'Mọi ngày', count: '10 + 0h', slots: ['07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00','22:30','00:00'], color: '#FDE68A', hours: '7h → 0h', desc: 'Dày + midnight' },
                    ] as const).map(({ label, sublabel, count, slots, color, hours, desc }, idx) => {
                      const isActive = selectedSlots.length === slots.length && slots.every(s => selectedSlots.includes(s))
                      return (
                        <button key={label}
                          onClick={() => setSelectedSlots([...slots])}
                          className="flex flex-col p-3 text-left transition-all w-full"
                          style={{
                            background: isActive ? `${color}18` : 'var(--color-bg-3)',
                            borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                          }}>
                          <div className="text-xs font-bold" style={{ color }}>{label}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sublabel} · <span style={{ color }}>{count}</span></div>
                          <div className="text-xs mt-1.5" style={{ color: 'var(--color-text-dim)' }}>{hours}</div>
                          <div className="text-xs italic" style={{ color: 'var(--color-text-dim)' }}>{desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    🕐 Khung giờ đã chọn <span style={{ color: 'var(--color-primary)' }}>({selectedSlots.length} giờ)</span>
                  </label>
                  <button onClick={() => setSelectedSlots([])}
                    className="text-xs px-2 py-0.5 rounded-lg"
                    style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)' }}>
                    Xóa tất cả
                  </button>
                </div>

                {/* Danh sách giờ đã thêm */}
                <div className="flex flex-wrap gap-2 mb-2 min-h-[36px]">
                  {[...selectedSlots].sort().map(slot => {
                    const [h] = slot.split(':').map(Number)
                    const isPeak = h >= 14 && h <= 21
                    return (
                      <div key={slot} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                        style={{
                          background: isPeak ? 'rgba(253,230,138,0.12)' : 'rgba(168,85,247,0.1)',
                          border: `1.5px solid ${isPeak ? '#FDE68A' : 'var(--color-primary)'}`,
                          color: isPeak ? '#FDE68A' : 'var(--color-primary)',
                        }}>
                        {slot}
                        <button onClick={() => setSelectedSlots(selectedSlots.filter(s => s !== slot))}
                          className="ml-1 opacity-60 hover:opacity-100" style={{ lineHeight: 1 }}>✕</button>
                      </div>
                    )
                  })}
                  {selectedSlots.length === 0 && (
                    <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Chưa có khung giờ nào — chọn bộ gợi ý bên trên hoặc thêm thủ công</p>
                  )}
                </div>
                {/* Input thêm giờ mới */}
                <div className="flex gap-2">
                  <input type="time" value={newSlot} onChange={e => setNewSlot(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                  <button
                    onClick={() => {
                      if (!newSlot || selectedSlots.includes(newSlot)) return
                      setSelectedSlots([...selectedSlots, newSlot])
                      setNewSlot('')
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                    + Thêm
                  </button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-dim)' }}>
                  💡 14:00–21:00 là giờ vàng ⭐, được ưu tiên tạo nhiều hơn
                </p>
              </div>

              {/* Prices */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-muted)' }}>Giá vé (VND)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '🪑 Thường',   val: priceStandard,  set: setPriceStandard,  color: '#60A5FA' },
                    { label: '👑 VIP',       val: priceVip,       set: setPriceVip,       color: '#A78BFA' },
                    { label: '💑 Đôi',       val: priceDouble,    set: setPriceDouble,    color: '#34D399' },
                    { label: '🛋 Recliner',  val: priceRecliner,  set: setPriceRecliner,  color: '#FB923C' },
                  ].map(({ label, val, set, color }) => (
                    <div key={label}>
                      <label className="text-xs font-medium mb-1 block" style={{ color }}>{label}</label>
                      <input type="number" value={val} onChange={e => set(+e.target.value)} step="10000"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                    </div>
                  ))}
                </div>
                {roomId && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#34D399' }}>
                    ✅ Giá đã tải từ cấu hình phòng · có thể chỉnh thủ công bên trên
                  </p>
                )}
              </div>

              {/* Conflict Risk Warning */}
              {movieIds.length > 1 && (
                <div className="rounded-2xl overflow-hidden"
                  style={{
                    border: `1px solid ${conflictRiskLevel === 'high' ? 'rgba(248,113,113,0.4)' : conflictRiskLevel === 'medium' ? 'rgba(253,230,138,0.4)' : 'rgba(52,211,153,0.3)'}`,
                    background: conflictRiskLevel === 'high' ? 'rgba(248,113,113,0.07)' : conflictRiskLevel === 'medium' ? 'rgba(253,230,138,0.07)' : 'rgba(52,211,153,0.07)',
                  }}>
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {conflictRiskLevel === 'high' ? '🚨' : conflictRiskLevel === 'medium' ? '⚠️' : '✅'}
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold mb-1"
                        style={{ color: conflictRiskLevel === 'high' ? '#F87171' : conflictRiskLevel === 'medium' ? '#FDE68A' : '#34D399' }}>
                        {conflictRiskLevel === 'high'
                          ? 'Nguy cơ trùng suất chiếu CAO'
                          : conflictRiskLevel === 'medium'
                          ? 'Nguy cơ trùng suất chiếu TRUNG BÌNH'
                          : 'Rủi ro thấp'}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {conflictRiskLevel === 'high' && (
                          <>Bạn đang tạo <strong>{movieIds.length} phim</strong> vào <strong>cùng 1 phòng cố định</strong>. Backend sẽ tự bỏ qua slot bị trùng, nhưng có thể nhiều suất không được tạo.<br/><span style={{ color: '#F87171' }}>👉 Đề xuất: Bỏ chọn phòng cụ thể → để hệ thống tự chọn phòng trống cho mỗi phim.</span></>
                        )}
                        {conflictRiskLevel === 'medium' && (
                          <><strong>{goldenSlots.length}/{selectedSlots.length} slot</strong> là giờ vàng (14h–21h). Với {movieIds.length} phim, backend sẽ cạnh tranh cùng khung giờ — một số suất có thể bị bỏ qua.<br/><span style={{ color: '#FDE68A' }}>👉 Đề xuất: Bỏ chọn phòng cụ thể hoặc chọn từng phim một.</span></>
                        )}
                        {conflictRiskLevel === 'low' && (
                          <>Không có phòng cố định — hệ thống sẽ tự phân bổ phòng trống cho mỗi slot. Rủi ro trùng thấp.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <motion.button onClick={() => generate()} disabled={isPending || movieIds.length === 0 || !theaterId}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#FDE68A,#F59E0B)', color: 'white', boxShadow: '0 4px 20px rgba(253,230,138,0.3)' }}>
                {isPending ? (
                  <><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-bg)', borderTopColor: 'transparent' }} /> Đang tính toán...</>
                ) : (
                  <><Zap className="w-5 h-5" /> Tạo Suất Chiếu Tự Động</>
                )}
              </motion.button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" style={{ color: '#34D399' }} />
                <span className="font-bold" style={{ color: '#34D399' }}>{result.message}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Thuật toán: {result.data?.algorithm}</p>
              <Link to="/admin/showtimes" className="inline-flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                Xem danh sách suất chiếu →
              </Link>
            </motion.div>
          )}
        </div>

        {/* RIGHT: Live Score Preview */}
        <div className="space-y-5">
          {movieIds.length === 0 ? (
            /* Chưa chọn phim — hiện thuật toán + quy trình */
            <div className="space-y-5">
              {/* Thuật Toán 5 Yếu Tố */}
              <div className="p-6 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <h2 className="font-bold text-base mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  🤖 Thuật Toán 5 Yếu Tố
                </h2>
                <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
                  Hệ thống tự động tính điểm ưu tiên cho từng khung giờ dựa trên 5 yếu tố, sau đó tạo lịch chiếu tối ưu
                </p>
                <div className="space-y-4">
                  {([
                    { icon: Calendar, label: 'Ngày trong tuần', desc: 'Cuối tuần ưu tiên hơn ngày thường',           color: 'var(--color-primary)' },
                    { icon: Clock,    label: 'Khung giờ',        desc: '19h–21h = prime time, 14h–17h = afternoon peak', color: '#FDE68A' },
                    { icon: Zap,      label: 'Giờ vàng',         desc: 'Tăng điểm ưu tiên vào giờ đẹp',              color: '#F472B6' },
                    { icon: Star,     label: 'Đánh giá phim',    desc: 'Rating cao → nhiều suất chiếu hơn',           color: '#94A3B8' },
                    { icon: Film,     label: 'Thể loại',         desc: 'Action/Thriller phù hợp giờ cao điểm',        color: '#34D399' },
                  ] as const).map(({ icon: Icon, label, desc, color }, i) => (
                    <motion.div key={label}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}18` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{i + 1}. {label}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quy Trình */}
              <div className="p-6 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>📋 Quy Trình</h2>
                <div className="space-y-3">
                  {[
                    { step: '01', text: 'Phân tích thông tin phim (thể loại, rating, thời lượng)' },
                    { step: '02', text: 'Tính điểm ưu tiên cho từng khung giờ trong khoảng ngày' },
                    { step: '03', text: 'Kiểm tra phòng chiếu có trống không (tránh xung đột)' },
                    { step: '04', text: 'Tạo danh sách suất chiếu theo thứ tự ưu tiên' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>{step}</div>
                      <p className="text-sm pt-1.5" style={{ color: 'var(--color-text-muted)' }}>{text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                    Chọn phim bên trái để xem điểm phân tích thực tế
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Đã chọn phim — hiện live score từng phim */
            <div className="space-y-4">
              {movieIds.map(mid => {
                const m = movies.find((x: any) => x._id === mid)
                if (!m) return null

                // Tính score 5 yếu tố — mỗi phim có điểm riêng dựa trên đặc tính phim
                const genres: string[] = (m.genres || []).map((g: string) => g.toLowerCase())

                // 1. Ngày trong tuần — dựa vào khoảng ngày admin chọn
                const start = new Date(startDate), end = new Date(endDate)
                const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)
                let weekendDays = 0
                for (let i = 0; i < totalDays; i++) {
                  const d = new Date(start); d.setDate(d.getDate() + i)
                  if (d.getDay() === 0 || d.getDay() === 6) weekendDays++
                }
                const weekendRatio = weekendDays / totalDays
                // Phim gia đình/hoạt hình hưởng lợi cuối tuần nhiều hơn
                const isKidFriendly = genres.some(g => ['hoạt hình','gia đình','hài','animation','family'].some(k => g.includes(k)))
                const dayScore = isKidFriendly
                  ? Math.round(50 + weekendRatio * 50)   // 50–100, ưu tiên cuối tuần
                  : Math.round(55 + weekendRatio * 35)   // 55–90

                // 2. Khung giờ — phim người lớn hợp giờ tối, phim trẻ em hợp giờ sáng/chiều
                const primeSlots = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 19 && h <= 21 })
                const morningSlots = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 8 && h <= 13 })
                const isAdultGenre = genres.some(g => ['kinh dị','hành động','thriller','horror','action','tâm lý','tình cảm'].some(k => g.includes(k)))
                const slotScore = selectedSlots.length === 0 ? 50
                  : isAdultGenre
                    ? Math.round((primeSlots.length / selectedSlots.length) * 100)   // ưu tiên giờ tối
                    : isKidFriendly
                      ? Math.round(((morningSlots.length + 1) / selectedSlots.length) * 80)  // ưu tiên sáng
                      : Math.round((primeSlots.length / selectedSlots.length) * 70 + 20)

                // 3. Giờ vàng — phim bom tấn/hành động được lợi hơn từ giờ vàng
                const goldenSlotsCount = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 14 && h <= 21 }).length
                const goldenRatio = selectedSlots.length > 0 ? goldenSlotsCount / selectedSlots.length : 0
                const isBomTan = genres.some(g => ['hành động','action','phiêu lưu','khoa học','viễn tưởng','kinh dị','thriller'].some(k => g.includes(k)))
                const goldenScore = isBomTan
                  ? Math.round(goldenRatio * 100)          // tận dụng tối đa giờ vàng
                  : Math.round(goldenRatio * 70 + 15)      // phim nhẹ nhàng ít phụ thuộc giờ vàng hơn

                // 4. Rating — chất lượng phim (ổn định, ít thay đổi)
                const ratingScore = m.rating > 0 ? Math.min(100, Math.round((m.rating / 10) * 100)) : 30

                // 5. Thể loại — phân loại chi tiết hơn
                const genreScore = (() => {
                  if (genres.some(g => ['hành động','action','kinh dị','horror','thriller'].some(k => g.includes(k)))) return 90
                  if (genres.some(g => ['phiêu lưu','khoa học viễn tưởng','fantasy','viễn tưởng'].some(k => g.includes(k)))) return 80
                  if (genres.some(g => ['hài','comedy','gia đình','family'].some(k => g.includes(k)))) return 75
                  if (genres.some(g => ['tình cảm','romance','tâm lý','drama'].some(k => g.includes(k)))) return 65
                  if (genres.some(g => ['hoạt hình','animation'].some(k => g.includes(k)))) return 60
                  return 55
                })()

                // 6. Độ Hot — dựa trên ratingCount (số lượt đánh giá) + rating
                const ratingCount = m.ratingCount ?? 0
                const reviewNorm = Math.min(100, Math.round((ratingCount / 50) * 100))
                const momentum = ratingCount > 0
                  ? Math.round(reviewNorm * 0.6 + (m.rating > 0 ? (m.rating / 10) * 40 : 20))
                  : 0
                const hotScore = momentum > 0 ? Math.min(100, momentum) : 15

                const hotNote = ratingCount > 0
                  ? `${ratingCount} lượt đánh giá · momentum ${hotScore}`
                  : 'Chưa có đánh giá · chờ phản hồi khán giả'

                // Tổng điểm 6 yếu tố — trọng số: slot/golden cao hơn vì ảnh hưởng trực tiếp lịch chiếu
                const totalScore = Math.round(
                  dayScore    * 0.15 +
                  slotScore   * 0.20 +
                  goldenScore * 0.20 +
                  ratingScore * 0.15 +
                  genreScore  * 0.15 +
                  hotScore    * 0.15
                )

                // Note mô tả cho từng yếu tố
                const dayNote = `${weekendDays}/${totalDays} ngày cuối tuần${isKidFriendly ? ' · Phim gia đình ưu tiên CN' : ''}`
                const slotNote = `${primeSlots.length}/${selectedSlots.length} giờ prime time${isAdultGenre ? ' · Phim tối ưu giờ tối' : isKidFriendly ? ' · Phim tối ưu giờ sáng' : ''}`
                const goldenNote = goldenScore >= 70 ? `${goldenSlotsCount}/${selectedSlots.length} slot giờ vàng ✅` : `${goldenSlotsCount}/${selectedSlots.length} slot giờ vàng · Ít`

                const SCORE_FACTORS = [
                  { icon: Calendar,    label: 'Ngày trong tuần', score: dayScore,    color: 'var(--color-primary)', note: dayNote },
                  { icon: Clock,       label: 'Khung giờ',        score: slotScore,   color: '#FDE68A',              note: slotNote },
                  { icon: Zap,         label: 'Giờ vàng',         score: goldenScore, color: '#F472B6',              note: goldenNote },
                  { icon: Star,        label: 'Chất lượng',       score: ratingScore, color: '#FDE68A',              note: m.rating > 0 ? `Rating ${m.rating}/10` : 'Chưa có đánh giá' },
                  { icon: Film,        label: 'Thể loại',         score: genreScore,  color: '#34D399',              note: m.genres?.slice(0, 2).join(', ') || 'Chưa có thể loại' },
                  { icon: TrendingUp,  label: 'Độ Hot',           score: hotScore,    color: '#FB923C',              note: hotNote },
                ]

                const scoreColor = totalScore >= 75 ? '#34D399' : totalScore >= 50 ? '#FDE68A' : '#F87171'

                return (
                  <motion.div key={mid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl"
                    style={{ background: 'var(--color-bg-2)', border: `1px solid ${scoreColor}30` }}>

                    {/* Label phim thứ mấy */}
                    {movieIds.length > 1 && (
                      <div className="text-xs font-bold mb-3 px-2 py-1 rounded-lg w-fit"
                        style={{ background: `${scoreColor}15`, color: scoreColor }}>
                        Phim {movieIds.indexOf(mid) + 1} / {movieIds.length}
                      </div>
                    )}

                    {/* Header phim */}
                    <div className="flex items-center gap-3 mb-4">
                      <img src={m.poster} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{m.duration}p · {m.genres?.slice(0,2).join(', ')}</div>
                      </div>
                      {/* Tổng điểm */}
                      <div className="flex-shrink-0 text-center">
                        <div className="text-2xl font-black" style={{ color: scoreColor }}>{totalScore}</div>
                        <div className="text-xs font-medium" style={{ color: scoreColor }}>
                          {totalScore >= 75 ? 'Tốt' : totalScore >= 50 ? 'Ổn' : 'Thấp'}
                        </div>
                      </div>
                    </div>

                    {/* 5 yếu tố với thanh progress */}
                    <div className="space-y-2.5">
                      {SCORE_FACTORS.map(({ icon: Icon, label, score, color, note }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3 h-3" style={{ color }} />
                              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{note}</span>
                              <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-3)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dự kiến số suất */}
                    <div className="mt-3 pt-3 flex items-center justify-between"
                      style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Dự kiến số suất:</span>
                      <span className="text-xs font-bold" style={{ color: scoreColor }}>
                        ~{Math.round(selectedSlots.length * (totalScore / 100) * Math.max(1,
                          Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000 + 1)
                        ))} suất
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}