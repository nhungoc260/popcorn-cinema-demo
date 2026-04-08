import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapPin, Phone, Clock, Search, ExternalLink, Building2 } from 'lucide-react'
import api, { showtimeApi } from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

// FIX: dùng local date tránh lệch timezone UTC vs VN (UTC+7)
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function TheatersPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [selectedTheater, setSelectedTheater] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(toLocalDate(new Date())) // FIX timezone
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const { data: theatersData, isLoading } = useQuery({
    queryKey: ['theaters-public'],
    queryFn: () => api.get('/theaters'),
    select: d => d.data.data as any[],
  })

  // Reset room filter khi đổi rạp hoặc ngày
  const handleSetDate = (v: string) => { setSelectedDate(v); setSelectedRoomId(null) }

  const { data: showtimesData } = useQuery({
    queryKey: ['theater-showtimes', selectedTheater?._id, selectedDate],
    queryFn: () => showtimeApi.getAll({ theaterId: selectedTheater._id, date: selectedDate }),
    select: d => d.data.data as any[],
    enabled: !!selectedTheater,
  })

  const theaters: any[] = (theatersData || []).filter((t: any) => {
    const matchSearch = t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.address?.toLowerCase().includes(search.toLowerCase())
    const matchCity = cityFilter === 'all' || t.city?.toLowerCase().includes(cityFilter.toLowerCase())
    return matchSearch && matchCity
  })

  // Unique cities để render chip filter
  const cities: string[] = [...new Set(
    (theatersData || []).map((t: any) => t.city).filter(Boolean)
  )] as string[]

  const showtimes: any[] = showtimesData || []

  // Unique rooms from showtimes
  const rooms: any[] = Object.values(
    showtimes.reduce((acc: Record<string, any>, st: any) => {
      if (st.room?._id) acc[st.room._id] = st.room
      return acc
    }, {})
  )

  // Group by movie, filter by room
  // FIX: lọc bỏ phim "ended"
  const byMovie: Record<string, { movie: any; times: any[] }> = {}
  showtimes
    .filter(st => !selectedRoomId || st.room?._id === selectedRoomId)
    .filter(st => st.movie?.status !== 'ended' && st.movie?.status !== 'suspended')
    .filter(st => {
      const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
      return endMs >= Date.now()
    })
    .forEach(st => {
      const mid = st.movie?._id
      if (!mid) return
      if (!byMovie[mid]) byMovie[mid] = { movie: st.movie, times: [] }
      byMovie[mid].times.push(st)
    })

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return {
      value: toLocalDate(d), // FIX timezone
      label: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' })
    }
  })

  const handleBook = (showtimeId: string) => {
    if (!token) { toast.error('Vui lòng đăng nhập'); navigate('/login'); return }
    navigate(`/seats/${showtimeId}`)
  }

  const mapsUrl = (t: any) =>
    `https://www.google.com/maps/embed/v1/place?key=AIzaSyD-dummy&q=${encodeURIComponent(`${t.name} ${t.address}`)}`

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">

        <h1 className="font-display font-bold text-4xl mb-2" style={{ color: 'var(--color-text)' }}>
          🏛 Hệ Thống <span className="text-gradient-cyan">Rạp Chiếu</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Chọn rạp để xem vị trí và lịch chiếu
        </p>

        <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: '75vh' }}>

          {/* ── LEFT: Theater list ── */}
          <div className="lg:w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm rạp..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
            </div>

            {/* City filter chips */}
            {cities.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setCityFilter('all'); setSelectedTheater(null) }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: cityFilter === 'all' ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
                    color: cityFilter === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    border: `1px solid ${cityFilter === 'all' ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                  }}>
                  Tất cả
                </button>
                {cities.map((city: string) => (
                  <button key={city}
                    onClick={() => { setCityFilter(city); setSelectedTheater(null) }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: cityFilter === city ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
                      color: cityFilter === city ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      border: `1px solid ${cityFilter === city ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                    }}>
                    {city}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-bg-2)' }} />)}
              </div>
            ) : theaters.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Không tìm thấy rạp</div>
            ) : (
              <div className="space-y-2">
                {theaters.map((t: any) => (
                  <motion.button key={t._id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => { setSelectedTheater(t); setSelectedRoomId(null) }}
                    className="w-full text-left p-3 rounded-xl transition-all"
                    style={{
                      background: selectedTheater?._id === t._id ? 'rgba(168,85,247,0.12)' : 'var(--color-bg-2)',
                      border: `1.5px solid ${selectedTheater?._id === t._id ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                    }}>
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: selectedTheater?._id === t._id ? 'var(--color-primary)' : 'var(--color-text-dim)' }} />
                      <div>
                        <div className="font-semibold text-sm"
                          style={{ color: selectedTheater?._id === t._id ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {t.name}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          📍 {t.address}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{t.city}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Map + Showtimes ── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {!selectedTheater ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center rounded-3xl"
                  style={{ background: 'var(--color-bg-2)', border: '2px dashed var(--color-glass-border)', minHeight: 400 }}>
                  <motion.div animate={{ y: [0,-8,0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <MapPin className="w-14 h-14 mb-4" style={{ color: 'var(--color-primary)', opacity: 0.4 }} />
                  </motion.div>
                  <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Chọn một rạp để xem</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Bản đồ & lịch chiếu sẽ hiện ở đây</p>
                </motion.div>
              ) : (
                <motion.div key={selectedTheater._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-4">

                  {/* Theater info bar */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl"
                    style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <div>
                      <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{selectedTheater.name}</h2>
                      <div className="flex items-center gap-1 text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedTheater.address}, {selectedTheater.city}
                      </div>
                      {selectedTheater.phone && (
                        <div className="flex items-center gap-1 text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          <Phone className="w-3.5 h-3.5" /> {selectedTheater.phone}
                        </div>
                      )}
                    </div>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedTheater.name + ' ' + selectedTheater.address + ' ' + selectedTheater.city)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                      style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.25)' }}>
                      <ExternalLink className="w-3.5 h-3.5" /> Mở Maps
                    </a>
                  </div>

                  {/* Google Maps embed */}
                  <div className="rounded-2xl overflow-hidden" style={{ height: 260, border: '1px solid var(--color-glass-border)' }}>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedTheater.name + ' ' + selectedTheater.address + ' ' + selectedTheater.city)}&output=embed&z=15&hl=vi`}
                      width="100%" height="100%" style={{ border: 0, display: 'block' }}
                      loading="lazy" title="map" />
                  </div>

                  {/* Date tabs + Room filter — cùng 1 hàng */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', paddingRight: '4px' }}>
                    {dates.map(d => (
                      <button key={d.value} onClick={() => handleSetDate(d.value)}
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: selectedDate === d.value ? 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))' : 'var(--color-bg-2)',
                          color: selectedDate === d.value ? 'white' : 'var(--color-text-muted)',
                          border: `1px solid ${selectedDate === d.value ? 'transparent' : 'var(--color-glass-border)'}`,
                        }}>
                        {d.label}
                      </button>
                    ))}

                    {/* Room filter — inline sau các nút ngày */}
                    {rooms.length > 1 && (
                      <div className="flex-shrink-0" style={{ paddingRight: '2px' }}>
                        <select
                          value={selectedRoomId || ''}
                          onChange={e => setSelectedRoomId(e.target.value || null)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all appearance-none cursor-pointer"
                          style={{
                            background: 'var(--color-bg-2)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-glass-border)',
                            outline: 'none',
                            minWidth: 'max-content',
                          }}>
                          <option value="">🏛 Tất cả phòng</option>
                          {rooms.map((r: any) => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Showtimes per movie */}
                  <div className="space-y-3">
                    {Object.values(byMovie).length === 0 ? (
                      <div className="flex flex-col items-center py-10 rounded-2xl"
                        style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                        <Clock className="w-8 h-8 mb-2" style={{ color: 'var(--color-text-dim)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Không có suất chiếu ngày này</p>
                      </div>
                    ) : (
                      Object.values(byMovie).map(({ movie, times }: { movie: any; times: any[] }) => (
                        <motion.div key={movie._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex gap-3 p-4 rounded-2xl"
                          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                          <img src={movie.poster} alt=""
                            className="w-14 h-20 object-cover rounded-xl flex-shrink-0 cursor-pointer"
                            onClick={() => navigate(`/movies/${movie._id}`)} />
                          <div className="flex-1">
                            <div className="font-bold text-sm mb-0.5 cursor-pointer hover:underline"
                              style={{ color: 'var(--color-text)' }}
                              onClick={() => navigate(`/movies/${movie._id}`)}>
                              {movie.title}
                            </div>
                            <div className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                              {movie.duration}p · {movie.genre?.slice(0,2).join(' · ')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {times.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                .filter(st => {
                                  const endMs = st.endTime ? new Date(st.endTime).getTime() : new Date(st.startTime).getTime() + (st.movie?.duration || 120) * 60 * 1000
                                  return endMs >= Date.now()
                                })
                                .map(st => {
                                  const isPast = false
                                  const available = (st.room?.totalSeats || 0) - (st.bookedSeats?.length || 0)
                                  return (
                                    <button key={st._id}
                                      disabled={isPast || available <= 0}
                                      onClick={() => handleBook(st._id)}
                                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                                      style={{
                                        border: `1.5px solid ${isPast || available <= 0 ? 'rgba(255,255,255,0.08)' : 'var(--color-primary)'}`,
                                        color: isPast || available <= 0 ? 'var(--color-text-dim)' : 'var(--color-primary)',
                                        background: isPast || available <= 0 ? 'transparent' : 'rgba(168,85,247,0.06)',
                                        opacity: isPast ? 0.4 : 1,
                                        cursor: isPast || available <= 0 ? 'not-allowed' : 'pointer',
                                      }}>
                                      {fmtTime(st.startTime)}
                                    </button>
                                  )
                                })}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}