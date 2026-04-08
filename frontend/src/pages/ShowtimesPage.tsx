import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Calendar, MapPin, Clock, ChevronRight, Search } from 'lucide-react'
import { showtimeApi } from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtPrice = (n: number) => (n / 1000).toFixed(0) + 'K'

export default function ShowtimesPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()

  // Step 1: Choose date
  // FIX: dùng local date tránh lệch timezone UTC vs VN (UTC+7)
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date()))
  // Step 2: Choose movie (optional filter)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  // Step 3: Choose theater (optional filter)
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState<string>('all')
  // Step 4: chosen showtime → go to seats
  const [search, setSearch] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      value: toLocalDate(d),
      dayName: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : d.toLocaleDateString('vi-VN', { weekday: 'short' }),
      dayNum:  d.getDate(),
      month:   d.getMonth() + 1,
    }
  })

  const { data: showtimesData, isLoading } = useQuery({
    queryKey: ['showtimes', selectedDate, selectedTheaterId],
    queryFn: () => showtimeApi.getAll({
      date: selectedDate,
      ...(selectedTheaterId ? { theaterId: selectedTheaterId } : {}),
    }),
    select: d => d.data.data as any[],
  })

  const allShowtimes: any[] = showtimesData || []

  // Unique movies from showtimes
  const movies = useMemo(() => {
    const map: Record<string, any> = {}
    allShowtimes.forEach(st => {
      if (st.movie?._id) map[st.movie._id] = st.movie
    })
    return Object.values(map)
  }, [allShowtimes])

  // Unique theaters from showtimes
  const theaters = useMemo(() => {
    const map: Record<string, any> = {}
    allShowtimes.forEach(st => {
      if (st.theater?._id) map[st.theater._id] = st.theater
    })
    return Object.values(map)
  }, [allShowtimes])

  // Unique rooms from showtimes
  const rooms = useMemo(() => {
    const map: Record<string, any> = {}
    allShowtimes
      .filter(st => !selectedTheaterId || st.theater?._id === selectedTheaterId)
      .forEach(st => { if (st.room?._id) map[st.room._id] = st.room })
    return Object.values(map)
  }, [allShowtimes, selectedTheaterId])

  // Unique cities từ theaters
  const cities: string[] = [...new Set(
    theaters.map((t: any) => t.city).filter(Boolean)
  )] as string[]

  // Filter + group by movie
  const grouped = useMemo(() => {
    const filtered = allShowtimes.filter(st => {
      if (selectedMovieId && st.movie?._id !== selectedMovieId) return false
      if (selectedTheaterId && st.theater?._id !== selectedTheaterId) return false
      if (cityFilter !== 'all' && !st.theater?.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false
      if (search && !st.movie?.title?.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedRoomId && st.room?._id !== selectedRoomId) return false
      return true
    })

    const g: Record<string, { movie: any; showtimes: any[] }> = {}
    filtered.forEach(st => {
      const mid = st.movie?._id
      if (!mid) return
      if (!g[mid]) g[mid] = { movie: st.movie, showtimes: [] }
      g[mid].showtimes.push(st)
    })
    return Object.values(g).filter(({ showtimes }) =>
      showtimes.some(st => {
        const endMs = st.endTime
          ? new Date(st.endTime).getTime()
          : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
        return endMs >= Date.now()
      })
    )
  }, [allShowtimes, selectedMovieId, selectedTheaterId, cityFilter, search, selectedRoomId])

  const handleBooking = (showtimeId: string) => {
    if (!token) { toast.error('Vui lòng đăng nhập để đặt vé'); navigate('/login'); return }
    navigate(`/seats/${showtimeId}`)
  }

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--color-bg)' }}>

      {/* ─ Hero header ─ */}
      <div className="px-4 pt-8 pb-6" style={{ background: 'linear-gradient(180deg, rgba(168,85,247,0.05) 0%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display font-bold text-4xl mb-2" style={{ color: 'var(--color-text)' }}>
            🎬 <span className="text-gradient-cyan">Suất Chiếu</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Chọn ngày → Chọn phim → Chọn giờ → Đặt vé
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">

        {/* ── STEP 1: Date picker ─────────────────────────── */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {dates.map(d => {
              const active = d.value === selectedDate
              return (
                <motion.button key={d.value}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedDate(d.value); setSelectedMovieId(null) }}
                  className="flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl transition-all min-w-[72px]"
                  style={{
                    background: active ? 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))' : 'var(--color-bg-2)',
                    border: `1.5px solid ${active ? 'transparent' : 'var(--color-glass-border)'}`,
                    boxShadow: active ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
                  }}>
                  <span className="text-xs font-medium mb-0.5" style={{ color: active ? 'rgba(0,0,0,0.7)' : 'var(--color-text-muted)' }}>
                    {d.dayName}
                  </span>
                  <span className="font-black text-xl" style={{ color: active ? 'white' : 'var(--color-text)' }}>
                    {d.dayNum}
                  </span>
                  <span className="text-xs" style={{ color: active ? 'rgba(0,0,0,0.6)' : 'var(--color-text-dim)' }}>
                    Th{d.month}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ── FILTERS ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm phim..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
          </div>

          {/* Theater + Room filter dropdowns */}
          <div className="flex gap-2 flex-wrap">
            {theaters.length > 0 && (
              <select value={selectedTheaterId || ''} onChange={e => { setSelectedTheaterId(e.target.value || null); setSelectedRoomId(null) }}
                className="px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)', minWidth: 160 }}>
                <option value="">🏛 Tất cả rạp</option>
                {theaters.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            )}
            {rooms.length > 1 && (
              <select value={selectedRoomId || ''} onChange={e => setSelectedRoomId(e.target.value || null)}
                className="px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)', minWidth: 160 }}>
                <option value="">🎭 Tất cả phòng</option>
                {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            )}
          </div>


        </div>

        {/* ── STEP 2+3: Showtime list ─────────────────────── */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--color-bg-2)' }} />
              ))}
            </motion.div>
          ) : grouped.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 rounded-3xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <Calendar className="w-14 h-14 mb-4" style={{ color: 'var(--color-text-dim)' }} />
              <p className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Không có suất chiếu</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Vui lòng chọn ngày khác hoặc rạp khác</p>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {grouped.map(({ movie, showtimes }, idx) => {
                // Group showtimes by theater
                const byTheater: Record<string, { theater: any; times: any[] }> = {}
                showtimes.forEach(st => {
                  const tid = st.theater?._id || 'unknown'
                  if (!byTheater[tid]) byTheater[tid] = { theater: st.theater, times: [] }
                  byTheater[tid].times.push(st)
                })

                return (
                  <motion.div key={movie._id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>

                    {/* Movie row */}
                    <div className="flex gap-4 p-4 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
                      <img src={movie.poster} alt={movie.title}
                        className="w-16 h-[90px] object-cover rounded-xl flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/movies/${movie._id}`)} />
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="font-bold text-base cursor-pointer hover:underline line-clamp-1"
                          style={{ color: 'var(--color-text)' }}
                          onClick={() => navigate(`/movies/${movie._id}`)}>
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {movie.genre?.slice(0,3).join(' · ')}
                          {movie.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{movie.duration}p</span>}
                          {movie.rating > 0 && <span className="text-yellow-400">⭐ {movie.rating}</span>}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/movies/${movie._id}`)}
                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 self-center"
                        style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.2)' }}>
                        Chi tiết <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Showtimes by theater */}
                    <div className="divide-y" style={{ borderColor: 'var(--color-glass-border)' }}>
                      {Object.values(byTheater).map(({ theater, times }) => (
                        <div key={theater?._id} className="p-4">
                          <div className="flex items-center gap-1.5 mb-3">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{theater?.name}</span>
                            {theater?.city && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>· {theater.city}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {times.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                              .filter(st => {
                                const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
                                return endMs >= Date.now()
                              })
                              .map(st => {
                                const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
                                const isPast = false // đã filter hết rồi
                                const available = (st.room?.totalSeats || 0) - (st.bookedSeats?.length || 0)
                                const isFull = available <= 0
                                return (
                                  <motion.button key={st._id}
                                    whileHover={{ scale: isPast || isFull ? 1 : 1.06 }}
                                    whileTap={{ scale: isPast || isFull ? 1 : 0.96 }}
                                    disabled={isPast || isFull}
                                    onClick={() => handleBooking(st._id)}
                                    className="flex flex-col items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                                    style={{
                                      background: isPast || isFull ? 'rgba(255,255,255,0.03)' : 'rgba(168,85,247,0.07)',
                                      border: `1.5px solid ${isPast || isFull ? 'rgba(255,255,255,0.08)' : 'var(--color-primary)'}`,
                                      color: isPast || isFull ? 'var(--color-text-dim)' : 'var(--color-primary)',
                                      opacity: isPast ? 0.4 : 1,
                                      cursor: isPast || isFull ? 'not-allowed' : 'pointer',
                                      minWidth: 72,
                                    }}>
                                    <span>{fmtTime(st.startTime)}</span>
                                    <span className="text-xs mt-0.5" style={{ color: isFull ? '#F87171' : 'rgba(168,85,247,0.6)', fontSize: 10 }}>
                                      {isFull ? 'Hết ghế' : `${available} ghế`}
                                    </span>
                                    {st.priceStandard && !isPast && !isFull && (
                                      <span className="text-xs" style={{ color: 'rgba(168,85,247,0.5)', fontSize: 10 }}>
                                        {fmtPrice(st.priceStandard)}đ
                                      </span>
                                    )}
                                  </motion.button>
                                )
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}