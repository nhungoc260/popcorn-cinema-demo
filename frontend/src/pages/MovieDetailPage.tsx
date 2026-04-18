import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Star, Clock, Calendar, Play, ChevronLeft, Ticket } from 'lucide-react'
import { movieApi, showtimeApi } from '../api'
import { DetailSkeleton } from '../components/ui/Skeletons'
import { useAuthStore } from '../store/authStore'
import ReviewSection from '../components/movie/ReviewSection'
import toast from 'react-hot-toast'

const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const formatTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [showTrailer, setShowTrailer] = useState(false)

  const { data: movieData, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => movieApi.getOne(id!),
    enabled: !!id,
  })

  const { data: showtimeData, isLoading: loadingShowtimes } = useQuery({
    queryKey: ['showtimes', id, selectedDate, selectedTheaterId],
    queryFn: () => showtimeApi.getAll({
      movieId: id,
      date: selectedDate || undefined,
      ...(selectedTheaterId ? { theaterId: selectedTheaterId } : {}),
    }),
    enabled: !!id,
  })

  // Query riêng lấy TẤT CẢ rạp của phim (không filter theaterId)
  const { data: allShowtimeData } = useQuery({
    queryKey: ['showtimes-all-theaters', id],
    queryFn: () => showtimeApi.getAll({ movieId: id }),
    enabled: !!id,
  })

  if (isLoading) return <DetailSkeleton />

  const movie = movieData?.data?.data
  if (!movie) return <div className="pt-24 text-center">Không tìm thấy phim</div>

  const showtimes: any[] = showtimeData?.data?.data || []

  // Lấy danh sách rạp từ ALL showtimes để filter không biến mất khi chọn rạp
  const theaterMap: Record<string, any> = {}
  ;(allShowtimeData?.data?.data || showtimes).forEach((s: any) => {
    if (s.theater?._id) theaterMap[s.theater._id] = s.theater
  })
  const theaters = Object.values(theaterMap)

  // Get unique dates
  const dates = [...new Set(showtimes.map((s: any) => new Date(s.startTime).toDateString()))].slice(0, 7)

  const getEmbedUrl = (url: string) => {
    if (!url) return ''
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (!match) return url
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      origin: window.location.origin,
    })
    return `https://www.youtube.com/embed/${match[1]}?${params.toString()}`
  }

  const handleBooking = (showtimeId: string) => {
    if (!token) { toast.error('Vui lòng đăng nhập để đặt vé'); navigate('/login'); return }
    navigate(`/seats/${showtimeId}`)
  }

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[50vh] sm:h-[60vh] overflow-hidden">
        <img src={movie.backdrop || movie.poster} alt={movie.title}
          className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.95) 100%)' }} />

        <button onClick={() => navigate(-1)}
          className="absolute top-24 left-4 sm:left-8 flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <ChevronLeft className="w-4 h-4" /> Quay Lại
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-40 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Poster */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="lg:col-span-1">
            <div className="rounded-2xl overflow-hidden shadow-2xl sticky top-24" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
              <img src={movie.poster} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
            </div>
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-6">

            {/* Title & meta */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {(movie.genres || []).map((g: string) => (
                  <span key={g} className="text-xs px-3 py-1 rounded-full"
                    style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.25)' }}>{g}</span>
                ))}
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1" style={{ color: 'var(--color-text)' }}>{movie.title}</h1>
              {movie.titleEn && <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>{movie.titleEn}</p>}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(253,230,138,0.1)', border: '1px solid rgba(253,230,138,0.2)' }}>
                <Star className="w-4 h-4 fill-current" style={{ color: '#FDE68A' }} />
                <span className="font-bold" style={{ color: '#FDE68A' }}>{movie.rating.toFixed(1)}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({movie.ratingCount.toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{movie.duration} phút</span>
              </div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                {movie.ageRating}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{movie.language}</span>
              </div>
              {movie.country && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
                  <span className="text-sm">🌍</span>
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{movie.country}</span>
                </div>
              )}
              {movie.subtitle && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <span className="text-sm">🎬</span>
                  <span className="text-sm" style={{ color: '#818CF8' }}>
                    {movie.subtitle === 'vietsub' ? 'Vietsub' : movie.subtitle === 'dubbed' ? 'Lồng Tiếng' : 'VN'}
                  </span>
                </div>
              )}
              {movie.note && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                  <span className="text-sm">📌</span>
                  <span className="text-sm" style={{ color: '#FBBF24' }}>{movie.note}</span>
                </div>
              )}
              {movie.releaseDate && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#60A5FA' }} />
                  <span className="text-sm" style={{ color: '#60A5FA' }}>
                    Khởi chiếu: {new Date(movie.releaseDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Nội Dung</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{movie.description}</p>
            </div>

            {/* Director & Cast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-dim)' }}>Đạo Diễn</p>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>{movie.director || 'N/A'}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-dim)' }}>Diễn Viên</p>
                <div className="flex flex-wrap gap-1">
                  {(movie.cast || []).slice(0, 4).map((c: any) => (
                    <span key={c.name} className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)' }}>{c.name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Trailer button */}
            {movie.trailer && (
              <button onClick={() => setShowTrailer(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Play className="w-4 h-4 fill-current" /> Xem Trailer
              </button>
            )}

            {/* Showtimes — date tabs + time buttons */}
            {movie.status === 'now_showing' && (
              <div>
                {/* Header: Lịch Chiếu + 2 dropdown rạp & phòng */}
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h3 className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
                    🎟 Lịch Chiếu
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Dropdown rạp — luôn hiện */}
                    {theaters.length > 0 && (
                      <select
                        value={selectedTheaterId || ''}
                        onChange={e => { setSelectedTheaterId(e.target.value || null); setSelectedRoomId(null) }}
                        className="px-3 py-2 rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer"
                        style={{
                          background: 'var(--color-bg-2)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-glass-border)',
                          outline: 'none',
                          maxWidth: 200,
                        }}>
                        <option value="">🏛 Tất cả rạp</option>
                        {theaters.map((t: any) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {/* Dropdown phòng — lấy phòng theo rạp đang chọn (hoặc tất cả), hiện khi >= 1 phòng */}
                    {(() => {
                      const allST = allShowtimeData?.data?.data || showtimes
                      // Lấy phòng theo rạp đang chọn — nếu chưa chọn rạp thì lấy tất cả
                      const filtered = selectedTheaterId
                        ? allST.filter((s: any) => s.theater?._id === selectedTheaterId)
                        : allST
                      const roomMap: Record<string, any> = {}
                      filtered.forEach((s: any) => { if (s.room?._id) roomMap[s.room._id] = s.room })
                      const rooms = Object.values(roomMap)
                      // Luôn hiện dropdown phòng (kể cả 1 phòng) để UI nhất quán
                      // Chỉ ẩn khi không có phòng nào
                      if (rooms.length === 0) return null
                      return (
                        <select
                          value={selectedRoomId || ''}
                          onChange={e => setSelectedRoomId(e.target.value || null)}
                          className="px-3 py-2 rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer"
                          style={{
                            background: 'var(--color-bg-2)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-glass-border)',
                            outline: 'none',
                            maxWidth: 180,
                          }}>
                          <option value="">🎬 Tất cả phòng</option>
                          {rooms.map((r: any) => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                          ))}
                        </select>
                      )
                    })()}
                  </div>
                </div>

                {loadingShowtimes ? (
                  <div className="space-y-3">
                    {[1,2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--color-bg-2)' }} />)}
                  </div>
                ) : showtimes.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                    <p style={{ color: 'var(--color-text-muted)' }}>Chưa có lịch chiếu</p>
                  </div>
                ) : (() => {
                  // Lấy uniqueDates từ allShowtimeData (không bị filter theo date)
                  const allForDates = (allShowtimeData?.data?.data || showtimes).filter((s: any) =>
                    !selectedTheaterId || s.theater?._id === selectedTheaterId
                  )
                  const uniqueDates = [...new Set(allForDates.map((s: any) =>
                    new Date(s.startTime).toISOString().split('T')[0]
                  ))].sort().slice(0, 7)

                  // Luôn hiện đủ 7 ngày kể từ hôm nay
                  const today = new Date().toISOString().split('T')[0]
                  const next7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(Date.now() + i * 86400000)
                    return d.toISOString().split('T')[0]
                  })

                  // Default về ngày gần nhất có suất, không cứng today
                  const firstAvailable = next7Days.find(d => uniqueDates.includes(d)) || today
                  const activeDate = selectedDate || firstAvailable

                  // Filter showtimes for selected date + room
                  const dayShowtimes = showtimes.filter((s: any) =>
                    new Date(s.startTime).toISOString().split('T')[0] === activeDate &&
                    (!selectedRoomId || s.room?._id === selectedRoomId)
                  )

                  const dayLabel = (d: string) => {
                    const date = new Date(d)
                    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    if (d === today) return { top: 'Hôm nay', bottom: '' }
                    if (d === tomorrow) return { top: 'Ngày mai', bottom: '' }
                    return {
                      top: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
                      bottom: `ngày ${date.getDate()}`
                    }
                  }

                  return (
                    <div>
                      {/* Date tabs — luôn hiện 7 ngày, ngày không có suất thì mờ/disabled */}
                      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {next7Days.map(d => {
                          const lbl = dayLabel(d)
                          const isActive = d === activeDate
                          const hasShowtime = uniqueDates.includes(d)
                          return (
                            <motion.button key={d}
                              whileTap={{ scale: hasShowtime ? 0.96 : 1 }}
                              onClick={() => hasShowtime && setSelectedDate(d)}
                              className="flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                              style={{
                                background: isActive ? 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))' : 'var(--color-bg-2)',
                                color: isActive ? 'white' : hasShowtime ? 'var(--color-text-muted)' : 'var(--color-text-dim)',
                                border: `1px solid ${isActive ? 'transparent' : 'var(--color-glass-border)'}`,
                                boxShadow: isActive ? '0 4px 14px rgba(168,85,247,0.35)' : 'none',
                                opacity: hasShowtime ? 1 : 0.35,
                                cursor: hasShowtime ? 'pointer' : 'not-allowed',
                                minWidth: 80,
                              }}>
                              <div>{lbl.top}</div>
                              {lbl.bottom && <div className="text-xs opacity-80">{lbl.bottom}</div>}
                            </motion.button>
                          )
                        })}
                      </div>

                      {/* Time buttons for selected day */}
                      {dayShowtimes.length === 0 ? (
                        <p className="text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>Không có suất chiếu ngày này</p>
                      ) : (
                        <div className="space-y-3">
                          {/* Group by room — deduplicate giờ trùng, giữ suất nhiều ghế nhất */}
                          {(() => {
                            const groups: Record<string, any[]> = {}
                            dayShowtimes.forEach((st: any) => {
                              const key = `${st.theater?._id || ''}__${st.room?.name || 'Phòng'}`
                              if (!groups[key]) groups[key] = []
                              groups[key].push(st)
                            })
                            return Object.entries(groups).map(([key, times]) => {
                              // Deduplicate: cùng giờ → giữ suất có nhiều ghế trống nhất
                              const deduped = Object.values(
                                times.reduce((acc: Record<string, any>, st: any) => {
                                  const timeKey = new Date(st.startTime).toISOString().slice(0, 16)
                                  const available = (st.room?.totalSeats || 50) - (st.bookedSeats?.length ?? 0)
                                  if (!acc[timeKey] || available > ((acc[timeKey].room?.totalSeats || 50) - (acc[timeKey].bookedSeats?.length ?? 0))) {
                                    acc[timeKey] = st
                                  }
                                  return acc
                                }, {})
                              )
                              const roomName = times[0]?.room?.name || 'Phòng'
                              const theaterName = times[0]?.theater?.name
                              const label = theaters.length > 1 && !selectedTheaterId
                                ? `${theaterName ? theaterName + ' · ' : ''}${roomName}`
                                : roomName
                              return (
                              <div key={key} className="p-4 rounded-2xl"
                                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                                <div className="text-xs font-semibold mb-3 flex items-center gap-2"
                                  style={{ color: 'var(--color-text-muted)' }}>
                                  🏛 {label}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(deduped as any[]).sort((a: any, b: any) =>
                                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                                  ).map((st: any) => {
                                    const isPast = new Date(st.startTime) < new Date()
                                    const available = (st.room?.totalSeats || 50) - (st.bookedSeats?.length ?? 0)
                                    if (isPast) return null
                                    return (
                                      <motion.button key={st._id}
                                        whileHover={{ scale: available <= 0 ? 1 : 1.06 }}
                                        whileTap={{ scale: available <= 0 ? 1 : 0.94 }}
                                        disabled={available <= 0}
                                        onClick={() => handleBooking(st._id)}
                                        className="flex flex-col items-center px-4 py-2.5 rounded-xl font-bold transition-all"
                                        style={{
                                          border: `1.5px solid ${available <= 0 ? 'rgba(255,255,255,0.08)' : 'var(--color-primary)'}`,
                                          color: available <= 0 ? 'var(--color-text-dim)' : 'var(--color-primary)',
                                          background: available <= 0 ? 'transparent' : 'rgba(168,85,247,0.06)',
                                          cursor: available <= 0 ? 'not-allowed' : 'pointer',
                                          minWidth: 72,
                                        }}>
                                        <span className="text-sm">{formatTime(st.startTime)}</span>
                                        <span className="text-xs mt-0.5" style={{
                                          color: available <= 0 ? '#F87171' : available <= 10 ? '#F97316' : 'rgba(168,85,247,0.55)',
                                          fontSize: 10
                                        }}>
                                          {available <= 0 ? 'Hết ghế' : `${available} ghế`}
                                        </span>
                                      </motion.button>
                                    )
                                  })}
                                </div>
                              </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          {/* Reviews */}
          <ReviewSection movieId={id!} />
          </motion.div>
        </div>
      </div>
      {/* Trailer Modal */}
      {showTrailer && movie.trailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowTrailer(false)}
              className="absolute -top-10 right-0 text-2xl font-bold transition-colors"
              style={{ color: 'white' }}>
              ✕
            </button>
            <div className="relative rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={getEmbedUrl(movie.trailer)}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}