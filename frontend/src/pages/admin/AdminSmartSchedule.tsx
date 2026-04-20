import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Zap, Calendar, Star, Film, Clock, CheckCircle, TrendingUp, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

// ── Helpers ──
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const MOVIE_COLORS = ['#A855F7','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1']
const FORMAT_COLORS: Record<string, string> = { '2D': '#60A5FA', '3D': '#A78BFA', 'IMAX': '#FDE68A', '4DX': '#F472B6' }
const LANG_LABELS: Record<string, string> = { sub: 'Vietsub', dub: 'Lồng tiếng', original: 'Nguyên bản' }

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
  const [previewWeekOffset, setPreviewWeekOffset] = useState(0)
  const [previewMode, setPreviewMode] = useState<'weekly' | 'timeline'>('weekly')
  const [step, setStep] = useState<1 | 2>(1) // 1=config, 2=preview result

  const { data: moviesData } = useQuery({ queryKey: ['movies-admin'], queryFn: () => api.get('/movies?limit=100'), select: d => d.data.data })
  const { data: theatersData } = useQuery({ queryKey: ['theaters-admin'], queryFn: () => api.get('/admin/theaters'), select: d => d.data.data })

  const movies: any[] = ((moviesData as any[]) || []).filter((m: any) => m.status === 'now_showing' || m.status === 'coming_soon')
  const filteredMovies = filterStatus ? movies.filter((m: any) => m.status === filterStatus) : movies
  const theaters: any[] = (theatersData as any[]) || []

  const movieColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    movies.forEach((m, i) => { map[m._id] = MOVIE_COLORS[i % MOVIE_COLORS.length] })
    return map
  }, [movies])

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
      const { data } = await api.post('/admin/showtimes/auto-generate', {
        movieIds, theaterId,
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
      setStep(2) // chuyển sang preview
      if (data.data?.breakdown) {
        data.data.breakdown.forEach((b: any) => {
          toast(`🎬 ${b.title}: ${b.generated} suất`, { duration: 3000 })
        })
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo suất chiếu'),
  })

  // ── Preview calendar from generated result ──
  const generatedShowtimes: any[] = useMemo(() => result?.data?.showtimes || [], [result])

  const today = new Date()
  const weekStart = useMemo(() => {
    const base = new Date(startDate)
    const day = base.getDay()
    const diff = day === 0 ? -6 : 1 - day
    base.setDate(base.getDate() + diff + previewWeekOffset * 7)
    base.setHours(0, 0, 0, 0)
    return base
  }, [startDate, previewWeekOffset])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d }), [weekStart])

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 7)

  const getShowsForDay = (day: Date) =>
    generatedShowtimes.filter((s: any) => s.startTime && isSameDay(new Date(s.startTime), day))

  // Unique rooms in result
  const uniqueRooms = useMemo(() => {
    const seen = new Set(); const result: any[] = []
    generatedShowtimes.forEach((s: any) => { if (s.room?._id && !seen.has(s.room._id)) { seen.add(s.room._id); result.push(s.room) } })
    return result
  }, [generatedShowtimes])

  // ── Score computation (same logic as original) ──
  const computeScore = (m: any) => {
    const genres: string[] = (m.genres || []).map((g: string) => g.toLowerCase())
    const start = new Date(startDate), end = new Date(endDate)
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)
    let weekendDays = 0
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i)
      if (d.getDay() === 0 || d.getDay() === 6) weekendDays++
    }
    const weekendRatio = weekendDays / totalDays
    const isKidFriendly = genres.some(g => ['hoạt hình','gia đình','hài','animation','family'].some(k => g.includes(k)))
    const dayScore = isKidFriendly ? Math.round(50 + weekendRatio * 50) : Math.round(55 + weekendRatio * 35)
    const primeSlots = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 19 && h <= 21 })
    const morningSlots = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 8 && h <= 13 })
    const isAdultGenre = genres.some(g => ['kinh dị','hành động','thriller','horror','action','tâm lý','tình cảm'].some(k => g.includes(k)))
    const slotScore = selectedSlots.length === 0 ? 50 : isAdultGenre
      ? Math.round((primeSlots.length / selectedSlots.length) * 100)
      : isKidFriendly ? Math.round(((morningSlots.length + 1) / selectedSlots.length) * 80)
      : Math.round((primeSlots.length / selectedSlots.length) * 70 + 20)
    const goldenSlotsCount = selectedSlots.filter(s => { const h = +s.split(':')[0]; return h >= 14 && h <= 21 }).length
    const goldenRatio = selectedSlots.length > 0 ? goldenSlotsCount / selectedSlots.length : 0
    const isBomTan = genres.some(g => ['hành động','action','phiêu lưu','khoa học','viễn tưởng','kinh dị','thriller'].some(k => g.includes(k)))
    const goldenScore = isBomTan ? Math.round(goldenRatio * 100) : Math.round(goldenRatio * 70 + 15)
    const ratingScore = m.rating > 0 ? Math.min(100, Math.round((m.rating / 10) * 100)) : 30
    const genreScore = (() => {
      if (genres.some(g => ['hành động','action','kinh dị','horror','thriller'].some(k => g.includes(k)))) return 90
      if (genres.some(g => ['phiêu lưu','khoa học viễn tưởng','fantasy','viễn tưởng'].some(k => g.includes(k)))) return 80
      if (genres.some(g => ['hài','comedy','gia đình','family'].some(k => g.includes(k)))) return 75
      if (genres.some(g => ['tình cảm','romance','tâm lý','drama'].some(k => g.includes(k)))) return 65
      return 55
    })()
    const ratingCount = m.ratingCount ?? 0
    const reviewNorm = Math.min(100, Math.round((ratingCount / 50) * 100))
    const momentum = ratingCount > 0 ? Math.round(reviewNorm * 0.6 + (m.rating > 0 ? (m.rating / 10) * 40 : 20)) : 0
    const hotScore = momentum > 0 ? Math.min(100, momentum) : 15
    const totalScore = Math.round(dayScore * 0.15 + slotScore * 0.20 + goldenScore * 0.20 + ratingScore * 0.15 + genreScore * 0.15 + hotScore * 0.15)
    return { totalScore, dayScore, slotScore, goldenScore, ratingScore, genreScore, hotScore, goldenSlotsCount, totalDays }
  }

  // ── Preview Calendar ──
  const PreviewCalendar = () => (
    <div className="space-y-4">
      {/* Success banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl flex items-center gap-3"
        style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)' }}>
        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34D399' }} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: '#34D399' }}>{result.message}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Thuật toán: {result.data?.algorithm}</div>
          {result.data?.breakdown && (
            <div className="flex flex-wrap gap-2 mt-2">
              {result.data.breakdown.map((b: any) => (
                <span key={b.title} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                  🎬 {b.title}: {b.generated} suất
                </span>
              ))}
            </div>
          )}
        </div>
        <Link to="/admin/showtimes" className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
          Xem tất cả →
        </Link>
      </motion.div>

      {/* View toggle + week nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewWeekOffset(w => w - 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {weekDays[0].getDate()}/{weekDays[0].getMonth()+1} — {weekDays[6].getDate()}/{weekDays[6].getMonth()+1}
          </span>
          <button onClick={() => setPreviewWeekOffset(w => w + 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-glass-border)' }}>
          {([
            { mode: 'weekly' as const, icon: Calendar, label: 'Tuần' },
            { mode: 'timeline' as const, icon: LayoutGrid, label: 'Phòng' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setPreviewMode(mode)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
              style={{
                background: previewMode === mode ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
                color: previewMode === mode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRight: mode === 'weekly' ? '1px solid var(--color-glass-border)' : 'none',
              }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {generatedShowtimes.length === 0 ? (
        <div className="text-center py-8 rounded-2xl text-sm" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          Không có suất nào trong tuần này — thử chuyển tuần khác
        </div>
      ) : previewMode === 'weekly' ? (
        /* Weekly grid */
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div style={{ borderRight: '1px solid var(--color-glass-border)', borderBottom: '1px solid var(--color-glass-border)' }} />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today)
              const count = getShowsForDay(day).length
              return (
                <div key={i} className="text-center py-2"
                  style={{ borderRight: i < 6 ? '1px solid var(--color-glass-border)' : 'none', borderBottom: '1px solid var(--color-glass-border)', background: isToday ? 'rgba(168,85,247,0.06)' : 'transparent' }}>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{['CN','T2','T3','T4','T5','T6','T7'][day.getDay()]}</div>
                  <div className={`text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center mx-auto`}
                    style={{ background: isToday ? 'var(--color-primary)' : 'transparent', color: isToday ? 'white' : 'var(--color-text)' }}>
                    {day.getDate()}
                  </div>
                  {count > 0 && <div className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{count}</div>}
                </div>
              )
            })}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            <div className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
              <div>
                {HOURS.map(h => (
                  <div key={h} style={{ height: 52, borderTop: '1px solid var(--color-glass-border)', borderRight: '1px solid var(--color-glass-border)' }}
                    className="flex items-start justify-end pr-1 pt-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-dim)', fontSize: 10 }}>{h}h</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day, di) => {
                const dayShows = getShowsForDay(day)
                return (
                  <div key={di} className="relative"
                    style={{ borderRight: di < 6 ? '1px solid var(--color-glass-border)' : 'none', background: isSameDay(day, today) ? 'rgba(168,85,247,0.03)' : 'transparent' }}>
                    {HOURS.map(h => <div key={h} style={{ height: 52, borderTop: '1px solid var(--color-glass-border)' }} />)}
                    {dayShows.map((s: any) => {
                      const start = new Date(s.startTime)
                      const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + 120 * 60000)
                      const startH = start.getHours() + start.getMinutes() / 60
                      const endH = end.getHours() + end.getMinutes() / 60
                      const top = Math.max(0, (startH - 7)) * 52
                      const height = Math.max(26, (endH - startH) * 52 - 2)
                      const color = movieColorMap[s.movie?._id || s.movie] || '#A855F7'
                      return (
                        <div key={s._id || Math.random()} className="absolute left-0.5 right-0.5 rounded-lg px-1 py-0.5 overflow-hidden"
                          style={{ top, height, background: `${color}22`, border: `1px solid ${color}55`, zIndex: 1 }}>
                          <div className="font-bold truncate" style={{ color, fontSize: 9 }}>
                            {typeof s.movie === 'object' ? s.movie?.title?.slice(0, 12) : movies.find(m => m._id === s.movie)?.title?.slice(0, 12)}
                          </div>
                          <div className="truncate" style={{ color: `${color}CC`, fontSize: 9 }}>
                            {fmtTime(s.startTime)}
                            {s.format && <span className="ml-0.5" style={{ color: FORMAT_COLORS[s.format] || color }}>{s.format}</span>}
                          </div>
                          {height > 42 && s.language && (
                            <div style={{ color: `${color}88`, fontSize: 9 }}>{LANG_LABELS[s.language] || s.language}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="px-3 py-2 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
            {movieIds.map(mid => {
              const m = movies.find(x => x._id === mid)
              if (!m) return null
              return (
                <div key={mid} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: movieColorMap[mid] }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.title?.slice(0, 14)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Timeline / room rows */
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <div className="overflow-auto" style={{ maxHeight: '480px' }}>
            <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: '110px repeat(7, 1fr)', background: 'var(--color-bg-2)' }}>
              <div className="px-2 py-2 text-xs font-bold" style={{ color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-glass-border)', borderBottom: '1px solid var(--color-glass-border)' }}>Phòng</div>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                return (
                  <div key={i} className="text-center py-2"
                    style={{ background: isToday ? 'rgba(168,85,247,0.08)' : 'transparent', borderRight: i < 6 ? '1px solid var(--color-glass-border)' : 'none', borderBottom: '1px solid var(--color-glass-border)' }}>
                    <div className="text-xs" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{['CN','T2','T3','T4','T5','T6','T7'][day.getDay()]}</div>
                    <div className="text-sm font-bold" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text)' }}>{day.getDate()}/{day.getMonth()+1}</div>
                  </div>
                )
              })}
            </div>
            {uniqueRooms.length === 0 ? (
              <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Không có dữ liệu phòng</div>
            ) : uniqueRooms.map((room: any) => (
              <div key={room._id} className="grid" style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}>
                <div className="px-2 py-2 flex flex-col justify-center"
                  style={{ borderRight: '1px solid var(--color-glass-border)', borderBottom: '1px solid var(--color-glass-border)', minHeight: 64 }}>
                  <div className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{room.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{room.type?.toUpperCase()}</div>
                </div>
                {weekDays.map((day, di) => {
                  const dayRoomShows = generatedShowtimes.filter((s: any) => {
                    const rid = typeof s.room === 'object' ? s.room?._id : s.room
                    return rid === room._id && s.startTime && isSameDay(new Date(s.startTime), day)
                  }).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  return (
                    <div key={di} className="p-1 flex flex-col gap-1"
                      style={{ borderRight: di < 6 ? '1px solid var(--color-glass-border)' : 'none', borderBottom: '1px solid var(--color-glass-border)', minHeight: 64, background: isSameDay(day, today) ? 'rgba(168,85,247,0.03)' : 'transparent' }}>
                      {dayRoomShows.map((s: any) => {
                        const mid = typeof s.movie === 'object' ? s.movie?._id : s.movie
                        const color = movieColorMap[mid] || '#A855F7'
                        const title = typeof s.movie === 'object' ? s.movie?.title : movies.find(m => m._id === mid)?.title
                        return (
                          <div key={s._id || Math.random()} className="rounded-lg px-1.5 py-1"
                            style={{ background: `${color}20`, border: `1px solid ${color}44` }}>
                            <div className="font-bold truncate" style={{ color, fontSize: 9 }}>{fmtTime(s.startTime)} {title?.slice(0,10)}</div>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {s.format && <span style={{ background: `${FORMAT_COLORS[s.format]||color}33`, color: FORMAT_COLORS[s.format]||color, fontSize: 8, padding: '0 3px', borderRadius: 3 }}>{s.format}</span>}
                              {s.language && <span style={{ color: `${color}AA`, fontSize: 8 }}>{LANG_LABELS[s.language]||s.language}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-3"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <Link to="/admin"><ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} /></Link>
        <Zap className="w-5 h-5" style={{ color: '#FDE68A' }} />
        <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Smart Scheduling — Tạo Suất Chiếu Tự Động</h1>

        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-2">
          {[{ n: 1, label: 'Cấu hình' }, { n: 2, label: 'Kết quả' }].map(({ n, label }) => (
            <button key={n} onClick={() => { if (n === 1 || result) setStep(n as 1|2) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: step === n ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: step === n ? 'var(--color-primary)' : 'var(--color-text-dim)',
                opacity: n === 2 && !result ? 0.4 : 1,
              }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: step === n ? 'var(--color-primary)' : 'var(--color-bg-3)', color: step === n ? 'white' : 'var(--color-text-muted)' }}>
                {n}
              </div>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {step === 2 && result ? (
          <div className="space-y-4">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-text-muted)' }}>
              <ArrowLeft className="w-4 h-4" /> Quay lại cấu hình
            </button>
            <PreviewCalendar />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* LEFT: Config (compact) */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Film className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> Cấu hình
                </h2>
                <div className="space-y-4">

                  {/* Movies */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Phim * <span style={{ color: 'var(--color-primary)' }}>({movieIds.length} đã chọn)</span>
                      </label>
                      <button onClick={() => setMovieIds(movieIds.length === filteredMovies.length ? [] : filteredMovies.map(m => m._id))}
                        className="text-xs px-2 py-0.5 rounded-lg"
                        style={{ color: 'var(--color-primary)', background: 'rgba(168,85,247,0.1)' }}>
                        {movieIds.length === filteredMovies.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="flex gap-1.5 mb-2">
                      {[
                        { value: '', label: 'Tất cả', color: 'var(--color-primary)' },
                        { value: 'now_showing', label: '🟢 Đang chiếu', color: '#34D399' },
                        { value: 'coming_soon', label: '🔵 Sắp chiếu', color: '#60A5FA' },
                      ].map(({ value, label, color }) => (
                        <button key={value} onClick={() => setFilterStatus(value)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{
                            background: filterStatus === value ? `${color}20` : 'var(--color-bg-3)',
                            border: `1px solid ${filterStatus === value ? color : 'var(--color-glass-border)'}`,
                            color: filterStatus === value ? color : 'var(--color-text-muted)',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                      {filteredMovies.map((m: any) => {
                        const checked = movieIds.includes(m._id)
                        const color = movieColorMap[m._id] || 'var(--color-primary)'
                        return (
                          <div key={m._id} onClick={() => setMovieIds(checked ? movieIds.filter(id => id !== m._id) : [...movieIds, m._id])}
                            className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer"
                            style={{ background: checked ? `${color}15` : 'var(--color-bg-3)', border: `1px solid ${checked ? `${color}50` : 'var(--color-glass-border)'}` }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background: checked ? color : 'transparent', border: `2px solid ${checked ? color : 'var(--color-glass-border)'}` }}>
                              {checked && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            {checked && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
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

                  {/* Theater + Room in 1 row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Rạp chiếu *</label>
                      <select value={theaterId} onChange={e => loadRooms(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
                        <option value="">-- Chọn rạp --</option>
                        {theaters.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Phòng <span style={{ color: 'var(--color-text-dim)' }}>(tuỳ chọn)</span></label>
                      <select value={roomId} onChange={e => {
                          const rid = e.target.value; setRoomId(rid)
                          if (rid) {
                            const room = rooms.find(r => r._id === rid)
                            if (room?.prices) {
                              if (room.prices.standard) setPriceStandard(room.prices.standard)
                              if (room.prices.vip) setPriceVip(room.prices.vip)
                              if (room.prices.couple) setPriceDouble(room.prices.couple)
                              if (room.prices.recliner) setPriceRecliner(room.prices.recliner)
                            }
                          }
                        }}
                        disabled={!theaterId}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
                        <option value="">-- Tự động --</option>
                        {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.name} ({r.totalSeats}g)</option>)}
                      </select>
                    </div>
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

                  {/* Time slots — quick presets */}
                  <div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {([
                        { label: 'Ngày thường', slots: ['08:00','10:30','13:00','15:30','18:00','20:30'], color: '#60A5FA' },
                        { label: 'Cuối tuần', slots: ['07:30','09:30','11:30','13:30','15:30','17:30','19:30','21:30','23:00'], color: '#A855F7' },
                        { label: 'Bom tấn', slots: ['07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00','22:30','00:00'], color: '#FDE68A' },
                      ] as const).map(({ label, slots, color }) => {
                        const isActive = selectedSlots.length === slots.length && slots.every(s => selectedSlots.includes(s))
                        return (
                          <button key={label} onClick={() => setSelectedSlots([...slots])}
                            className="py-1.5 px-2 rounded-xl text-xs font-medium text-center"
                            style={{
                              background: isActive ? `${color}18` : 'var(--color-bg-3)',
                              border: `1px solid ${isActive ? color : 'var(--color-glass-border)'}`,
                              color: isActive ? color : 'var(--color-text-muted)',
                            }}>
                            {label}
                            <div className="text-xs mt-0.5" style={{ color: isActive ? color : 'var(--color-text-dim)', fontSize: 10 }}>{slots.length} suất</div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Khung giờ <span style={{ color: 'var(--color-primary)' }}>({selectedSlots.length})</span>
                      </label>
                      <button onClick={() => setSelectedSlots([])}
                        className="text-xs px-2 py-0.5 rounded-lg"
                        style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)' }}>
                        Xóa tất cả
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
                      {[...selectedSlots].sort().map(slot => {
                        const [h] = slot.split(':').map(Number)
                        const isPeak = h >= 14 && h <= 21
                        return (
                          <div key={slot} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                            style={{ background: isPeak ? 'rgba(253,230,138,0.12)' : 'rgba(168,85,247,0.1)', border: `1px solid ${isPeak ? '#FDE68A' : 'var(--color-primary)'}`, color: isPeak ? '#FDE68A' : 'var(--color-primary)' }}>
                            {slot}
                            <button onClick={() => setSelectedSlots(selectedSlots.filter(s => s !== slot))} className="opacity-60 hover:opacity-100 ml-0.5">✕</button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input type="time" value={newSlot} onChange={e => setNewSlot(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                      <button onClick={() => { if (!newSlot || selectedSlots.includes(newSlot)) return; setSelectedSlots([...selectedSlots, newSlot]); setNewSlot('') }}
                        className="px-4 py-2 rounded-xl text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white' }}>
                        + Thêm
                      </button>
                    </div>
                  </div>

                  {/* Prices compact */}
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-muted)' }}>Giá vé (VND)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '🪑 Thường', val: priceStandard, set: setPriceStandard, color: '#60A5FA' },
                        { label: '👑 VIP', val: priceVip, set: setPriceVip, color: '#A78BFA' },
                        { label: '💑 Đôi', val: priceDouble, set: setPriceDouble, color: '#34D399' },
                        { label: '🛋 Recliner', val: priceRecliner, set: setPriceRecliner, color: '#FB923C' },
                      ].map(({ label, val, set, color }) => (
                        <div key={label}>
                          <label className="text-xs font-medium mb-1 block" style={{ color }}>{label}</label>
                          <input type="number" value={val} onChange={e => set(+e.target.value)} step="10000"
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conflict warning */}
                  {movieIds.length > 1 && (
                    <div className="rounded-2xl p-3"
                      style={{
                        border: `1px solid ${conflictRiskLevel === 'high' ? 'rgba(248,113,113,0.4)' : conflictRiskLevel === 'medium' ? 'rgba(253,230,138,0.4)' : 'rgba(52,211,153,0.3)'}`,
                        background: conflictRiskLevel === 'high' ? 'rgba(248,113,113,0.07)' : conflictRiskLevel === 'medium' ? 'rgba(253,230,138,0.07)' : 'rgba(52,211,153,0.07)',
                      }}>
                      <div className="flex items-center gap-2 text-xs font-bold"
                        style={{ color: conflictRiskLevel === 'high' ? '#F87171' : conflictRiskLevel === 'medium' ? '#FDE68A' : '#34D399' }}>
                        <span>{conflictRiskLevel === 'high' ? '🚨' : conflictRiskLevel === 'medium' ? '⚠️' : '✅'}</span>
                        {conflictRiskLevel === 'high' ? 'Nguy cơ trùng suất CAO' : conflictRiskLevel === 'medium' ? 'Nguy cơ trùng TRUNG BÌNH' : 'Rủi ro thấp'}
                      </div>
                      {conflictRiskLevel !== 'low' && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {conflictRiskLevel === 'high' ? '👉 Bỏ chọn phòng cụ thể để hệ thống tự phân bổ.' : '👉 Cân nhắc chọn từng phim một.'}
                        </p>
                      )}
                    </div>
                  )}

                  <motion.button onClick={() => generate()} disabled={isPending || movieIds.length === 0 || !theaterId}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#FDE68A,#F59E0B)', color: 'white', boxShadow: '0 4px 20px rgba(253,230,138,0.3)' }}>
                    {isPending
                      ? <><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }} /> Đang tính toán...</>
                      : <><Zap className="w-5 h-5" /> Tạo Suất Chiếu Tự Động</>}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* RIGHT: Algorithm info / live score */}
            <div className="space-y-4">
              {movieIds.length === 0 ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                    <h2 className="font-bold text-base mb-4" style={{ color: 'var(--color-text)' }}>🤖 Thuật Toán 6 Yếu Tố</h2>
                    <div className="space-y-3">
                      {([
                        { icon: Calendar, label: 'Ngày trong tuần', desc: 'Cuối tuần ưu tiên hơn ngày thường', color: 'var(--color-primary)' },
                        { icon: Clock, label: 'Khung giờ', desc: '19h–21h = prime time', color: '#FDE68A' },
                        { icon: Zap, label: 'Giờ vàng', desc: '14h–21h tăng điểm ưu tiên', color: '#F472B6' },
                        { icon: Star, label: 'Đánh giá phim', desc: 'Rating cao → nhiều suất hơn', color: '#94A3B8' },
                        { icon: Film, label: 'Thể loại', desc: 'Action/Thriller ưu tiên giờ cao điểm', color: '#34D399' },
                        { icon: TrendingUp, label: 'Độ Hot', desc: 'Số lượt đánh giá + momentum', color: '#FB923C' },
                      ] as const).map(({ icon: Icon, label, desc, color }, i) => (
                        <div key={label} className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{i + 1}. {label}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                    <h2 className="font-bold text-base mb-3" style={{ color: 'var(--color-text)' }}>📋 Quy Trình</h2>
                    <div className="space-y-2.5">
                      {[
                        { step: '01', text: 'Phân tích thông tin phim (thể loại, rating, thời lượng)' },
                        { step: '02', text: 'Tính điểm ưu tiên cho từng khung giờ trong khoảng ngày' },
                        { step: '03', text: 'Kiểm tra phòng chiếu có trống (tránh xung đột)' },
                        { step: '04', text: 'Tạo danh sách suất chiếu theo thứ tự ưu tiên' },
                      ].map(({ step, text }) => (
                        <div key={step} className="flex gap-3 items-start">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>{step}</div>
                          <p className="text-sm pt-1" style={{ color: 'var(--color-text-muted)' }}>{text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
                      <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Chọn phim bên trái để xem điểm phân tích</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {movieIds.map(mid => {
                    const m = movies.find(x => x._id === mid)
                    if (!m) return null
                    const { totalScore, dayScore, slotScore, goldenScore, ratingScore, genreScore, hotScore, goldenSlotsCount, totalDays } = computeScore(m)
                    const scoreColor = totalScore >= 75 ? '#34D399' : totalScore >= 50 ? '#FDE68A' : '#F87171'
                    const color = movieColorMap[mid] || '#A855F7'

                    const FACTORS = [
                      { icon: Calendar, label: 'Ngày trong tuần', score: dayScore, color: color },
                      { icon: Clock, label: 'Khung giờ', score: slotScore, color: '#FDE68A' },
                      { icon: Zap, label: 'Giờ vàng', score: goldenScore, color: '#F472B6' },
                      { icon: Star, label: 'Chất lượng', score: ratingScore, color: '#FDE68A' },
                      { icon: Film, label: 'Thể loại', score: genreScore, color: '#34D399' },
                      { icon: TrendingUp, label: 'Độ Hot', score: hotScore, color: '#FB923C' },
                    ]

                    return (
                      <motion.div key={mid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl"
                        style={{ background: 'var(--color-bg-2)', border: `1px solid ${scoreColor}30`, borderLeft: `3px solid ${color}` }}>
                        <div className="flex items-center gap-3 mb-3">
                          <img src={m.poster} alt="" className="w-9 h-12 object-cover rounded-lg flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.duration}p · {m.genres?.slice(0,2).join(', ')}</div>
                          </div>
                          <div className="text-center flex-shrink-0">
                            <div className="text-2xl font-black" style={{ color: scoreColor }}>{totalScore}</div>
                            <div className="text-xs font-medium" style={{ color: scoreColor }}>
                              {totalScore >= 75 ? 'Tốt' : totalScore >= 50 ? 'Ổn' : 'Thấp'}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {FACTORS.map(({ icon: Icon, label, score, color: fc }) => (
                            <div key={label}>
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1">
                                  <Icon className="w-3 h-3" style={{ color: fc }} />
                                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                                </div>
                                <span className="text-xs font-bold w-8 text-right" style={{ color: fc }}>{score}</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-3)' }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${fc}88,${fc})` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2.5 pt-2.5 flex items-center justify-between"
                          style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Dự kiến:</span>
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
        )}
      </div>
    </div>
  )
}