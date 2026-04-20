import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, LayoutGrid, Clock, ChevronLeft, ChevronRight, List } from 'lucide-react'
import api, { showtimeApi, movieApi } from '../../api'
import toast from 'react-hot-toast'

const fmtDT = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const fmtDateShort = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

const EMPTY = {
  movie: '', theater: '', room: '', startTime: '',
  language: 'sub', format: '2D',
  basePrice: 85000, priceVip: 110000, priceDouble: 180000, priceRecliner: 150000,
}

const MOVIE_COLORS = [
  '#A855F7','#3B82F6','#10B981','#F59E0B','#EF4444',
  '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1',
]

const LANG_LABELS: Record<string, string> = { sub: 'Vietsub', dub: 'Lồng tiếng', original: 'Nguyên bản' }
const FORMAT_COLORS: Record<string, string> = { '2D': '#60A5FA', '3D': '#A78BFA', 'IMAX': '#FDE68A', '4DX': '#F472B6' }

export default function AdminShowtimes() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [rooms, setRooms] = useState<any[]>([])
  const [filterMovie, setFilterMovie] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'weekly' | 'timeline'>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [filterTheater, setFilterTheater] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [filterRooms, setFilterRooms] = useState<any[]>([])

  const loadFilterRooms = async (tid: string) => {
    setFilterTheater(tid); setFilterRoom('')
    if (!tid) { setFilterRooms([]); return }
    try {
      const { data } = await api.get(`/admin/rooms?theaterId=${tid}`)
      setFilterRooms(data.data || [])
    } catch { setFilterRooms([]) }
  }

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const { data: showtimes, isLoading } = useQuery({
    queryKey: ['admin-showtimes'],
    queryFn: () => showtimeApi.getAll({ limit: 500 }),
    select: d => d.data.data as any[],
  })
  const { data: movies } = useQuery({
    queryKey: ['movies-all'],
    queryFn: () => movieApi.getAll({ limit: 100 }),
    select: d => d.data.data as any[],
  })
  const { data: theaters } = useQuery({
    queryKey: ['theaters-admin'],
    queryFn: () => api.get('/admin/theaters'),
    select: d => d.data.data as any[],
  })

  const loadRooms = async (theaterId: string) => {
    setForm((f: any) => ({ ...f, theater: theaterId, room: '' }))
    if (!theaterId) { setRooms([]); return }
    try {
      const { data } = await api.get(`/admin/rooms?theaterId=${theaterId}`)
      setRooms(data.data || [])
    } catch { setRooms([]) }
  }

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      if (!form.movie || !form.theater || !form.room || !form.startTime)
        throw new Error('Vui lòng điền đầy đủ thông tin')
      const movie = (movies || []).find((m: any) => m._id === form.movie)
      const duration = movie?.duration || 120
      const start = new Date(form.startTime)
      const end = new Date(start.getTime() + (duration + 30) * 60000)
      return api.post('/admin/showtimes', {
        movie: form.movie, theater: form.theater, room: form.room,
        startTime: start.toISOString(), endTime: end.toISOString(),
        language: form.language, format: form.format,
        basePrice: +form.basePrice, priceStandard: +form.basePrice,
        priceVip: +form.priceVip, priceDouble: +form.priceDouble,
        priceRecliner: +form.priceRecliner, isActive: true,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-showtimes'] })
      toast.success('✅ Đã thêm suất chiếu!')
      setShowForm(false); setForm(EMPTY); setRooms([])
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.message || 'Lỗi tạo suất chiếu'),
  })

  const { mutate: delBulk, isPending: deleting } = useMutation({
    mutationFn: () => Promise.all(list.map((s: any) => showtimeApi.delete(s._id))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-showtimes'] })
      toast.success(`🗑 Đã xóa ${list.length} suất chiếu!`)
      setShowDeleteModal(false)
    },
    onError: () => toast.error('Lỗi khi xóa'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: string) => showtimeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-showtimes'] }); toast.success('Đã xóa') },
  })

  const allMovies = (movies || [])
  const filteredMovies = filterStatus ? allMovies.filter((m: any) => m.status === filterStatus) : allMovies
  const list = (showtimes || []).filter((s: any) =>
    (!filterMovie || s.movie?._id === filterMovie) &&
    (!filterStatus || filteredMovies.some((m: any) => m._id === s.movie?._id)) &&
    (!filterTheater || s.theater?._id === filterTheater) &&
    (!filterRoom || s.room?._id === filterRoom)
  )

  // Movie color map
  const movieColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    ;(allMovies || []).forEach((m: any, i: number) => {
      map[m._id] = MOVIE_COLORS[i % MOVIE_COLORS.length]
    })
    return map
  }, [allMovies])

  // Week days
  const today = new Date()
  const weekStart = useMemo(() => {
    const d = new Date(today)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff + weekOffset * 7)
    d.setHours(0, 0, 0, 0)
    return d
  }, [weekOffset])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }), [weekStart])

  // Hours range for calendar (7h - 24h)
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 7)

  // Showtime in a given day
  const getShowtimesForDay = (day: Date) =>
    list.filter((s: any) => s.startTime && isSameDay(new Date(s.startTime), day))

  // Unique rooms in current list
  const uniqueRooms = useMemo(() => {
    const seen = new Set()
    const result: any[] = []
    list.forEach((s: any) => {
      const key = s.room?._id
      if (key && !seen.has(key)) { seen.add(key); result.push(s.room) }
    })
    return result
  }, [list])

  const S = { background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }

  // ── Weekly Calendar View ──
  const WeeklyView = () => (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
      {/* Week header nav */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)' }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          {fmtDateShort(weekDays[0])} — {fmtDateShort(weekDays[6])}
          {weekOffset === 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-primary)' }}>Tuần này</span>}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)' }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day columns header */}
      <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div style={{ borderRight: '1px solid var(--color-glass-border)' }} />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          const count = getShowtimesForDay(day).length
          return (
            <div key={i} className="text-center py-2 px-1"
              style={{ borderRight: i < 6 ? '1px solid var(--color-glass-border)' : 'none', background: isToday ? 'rgba(168,85,247,0.06)' : 'transparent' }}>
              <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {['CN','T2','T3','T4','T5','T6','T7'][day.getDay()]}
              </div>
              <div className={`text-sm font-bold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto ${isToday ? 'text-white' : ''}`}
                style={{ background: isToday ? 'var(--color-primary)' : 'transparent', color: isToday ? 'white' : 'var(--color-text)' }}>
                {day.getDate()}
              </div>
              {count > 0 && (
                <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-primary)' }}>{count} suất</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: '520px', scrollbarWidth: 'thin' }}>
        <div className="grid relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height: 56, borderTop: '1px solid var(--color-glass-border)', borderRight: '1px solid var(--color-glass-border)' }}
                className="flex items-start justify-end pr-2 pt-1">
                <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const dayShows = getShowtimesForDay(day)
            return (
              <div key={di} className="relative"
                style={{ borderRight: di < 6 ? '1px solid var(--color-glass-border)' : 'none', background: isSameDay(day, today) ? 'rgba(168,85,247,0.03)' : 'transparent' }}>
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} style={{ height: 56, borderTop: '1px solid var(--color-glass-border)' }} />
                ))}
                {/* Showtime blocks */}
                {dayShows.map((s: any) => {
                  const start = new Date(s.startTime)
                  const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + 120 * 60000)
                  const startH = start.getHours() + start.getMinutes() / 60
                  const endH = end.getHours() + end.getMinutes() / 60
                  const top = Math.max(0, (startH - 7)) * 56
                  const height = Math.max(28, (endH - startH) * 56 - 2)
                  const color = movieColorMap[s.movie?._id] || '#A855F7'
                  return (
                    <div key={s._id}
                      className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 overflow-hidden cursor-pointer group"
                      style={{ top, height, background: `${color}22`, border: `1px solid ${color}55`, zIndex: 1 }}
                      title={`${s.movie?.title} — ${fmtTime(s.startTime)}`}>
                      <div className="text-xs font-bold truncate leading-tight" style={{ color }}>
                        {s.movie?.title?.slice(0, 14)}
                      </div>
                      <div className="text-xs truncate mt-0.5" style={{ color: `${color}CC`, fontSize: 10 }}>
                        {fmtTime(s.startTime)}
                        {s.format && <span className="ml-1 px-1 rounded" style={{ background: `${FORMAT_COLORS[s.format] || color}33`, color: FORMAT_COLORS[s.format] || color }}>{s.format}</span>}
                        {s.language && <span className="ml-1" style={{ color: `${color}99` }}>{LANG_LABELS[s.language] || s.language}</span>}
                      </div>
                      {height > 48 && (
                        <div className="text-xs truncate" style={{ color: `${color}88`, fontSize: 10 }}>
                          {s.room?.name} · {s.theater?.name?.slice(0, 10)}
                        </div>
                      )}
                      {/* Delete on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('Xóa suất này?')) del(s._id) }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(244,63,94,0.2)', color: '#F43F5E', fontSize: 9 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {allMovies.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
          {allMovies.slice(0, 8).map((m: any) => (
            <div key={m._id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: movieColorMap[m._id] }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.title?.slice(0, 16)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Timeline View (rooms as rows) ──
  const TimelineView = () => (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)' }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          Timeline — {fmtDateShort(weekDays[0])} đến {fmtDateShort(weekDays[6])}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)' }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '560px', scrollbarWidth: 'thin' }}>
        {/* Header: days */}
        <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: '120px repeat(7, 1fr)', background: 'var(--color-bg-2)' }}>
          <div className="px-3 py-2 text-xs font-bold" style={{ color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-glass-border)', borderBottom: '1px solid var(--color-glass-border)' }}>Phòng chiếu</div>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={i} className="text-center py-2"
                style={{ background: isToday ? 'rgba(168,85,247,0.08)' : 'transparent', borderRight: i < 6 ? '1px solid var(--color-glass-border)' : 'none', borderBottom: '1px solid var(--color-glass-border)' }}>
                <div className="text-xs" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {['CN','T2','T3','T4','T5','T6','T7'][day.getDay()]}
                </div>
                <div className="text-sm font-bold" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {day.getDate()}/{day.getMonth() + 1}
                </div>
              </div>
            )
          })}
        </div>

        {/* Room rows */}
        {uniqueRooms.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>Không có dữ liệu trong tuần này</div>
        ) : (
          uniqueRooms.map((room: any) => (
            <div key={room._id} className="grid" style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}>
              {/* Room label */}
              <div className="px-3 py-2 flex flex-col justify-center"
                style={{ borderRight: '1px solid var(--color-glass-border)', borderBottom: '1px solid var(--color-glass-border)', minHeight: 72 }}>
                <div className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>{room.name}</div>
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{room.type?.toUpperCase()}</div>
              </div>

              {/* Day cells */}
              {weekDays.map((day, di) => {
                const dayRoomShows = list.filter((s: any) =>
                  s.room?._id === room._id && s.startTime && isSameDay(new Date(s.startTime), day)
                ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

                return (
                  <div key={di} className="p-1 flex flex-col gap-1"
                    style={{
                      borderRight: di < 6 ? '1px solid var(--color-glass-border)' : 'none',
                      borderBottom: '1px solid var(--color-glass-border)',
                      background: isSameDay(day, today) ? 'rgba(168,85,247,0.03)' : 'transparent',
                      minHeight: 72,
                    }}>
                    {dayRoomShows.map((s: any) => {
                      const color = movieColorMap[s.movie?._id] || '#A855F7'
                      return (
                        <div key={s._id} className="rounded-lg px-1.5 py-1 group relative"
                          style={{ background: `${color}20`, border: `1px solid ${color}44` }}>
                          <div className="text-xs font-bold truncate" style={{ color, fontSize: 10 }}>
                            {fmtTime(s.startTime)} {s.movie?.title?.slice(0, 10)}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {s.format && (
                              <span className="text-xs px-1 rounded" style={{ background: `${FORMAT_COLORS[s.format] || color}33`, color: FORMAT_COLORS[s.format] || color, fontSize: 9 }}>
                                {s.format}
                              </span>
                            )}
                            {s.language && (
                              <span className="text-xs" style={{ color: `${color}AA`, fontSize: 9 }}>
                                {LANG_LABELS[s.language] || s.language}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => { if (confirm('Xóa suất này?')) del(s._id) }}
                            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(244,63,94,0.2)', color: '#F43F5E', fontSize: 8 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>Suất Chiếu</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>{list.length}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-glass-border)' }}>
            {([
              { mode: 'weekly', icon: Calendar, label: 'Tuần' },
              { mode: 'timeline', icon: LayoutGrid, label: 'Timeline' },
              { mode: 'list', icon: List, label: 'Danh sách' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                style={{
                  background: viewMode === mode ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
                  color: viewMode === mode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderRight: mode !== 'list' ? '1px solid var(--color-glass-border)' : 'none',
                }}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {list.length > 0 && (
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)' }}>
              <Trash2 className="w-4 h-4" /> Xóa {list.length}
            </button>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
            <Plus className="w-4 h-4" /> Thêm Suất
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="p-3 rounded-2xl flex flex-wrap gap-3 items-center"
        style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>

        {/* Theater dropdown */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>🏛 Rạp</span>
          <select value={filterTheater} onChange={e => loadFilterRooms(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none"
            style={{ background: 'var(--color-bg-3)', border: `1px solid ${filterTheater ? 'var(--color-primary)' : 'var(--color-glass-border)'}`, color: filterTheater ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: filterTheater ? 600 : 400 }}>
            <option value="">Tất cả rạp</option>
            {(theaters || []).map((t: any) => (
              <option key={t._id} value={t._id}>{t.name} — {t.city}</option>
            ))}
          </select>
        </div>

        {/* Room dropdown — only show when theater selected */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>🚪 Phòng</span>
          <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
            disabled={!filterTheater}
            className="px-3 py-1.5 rounded-xl text-xs outline-none disabled:opacity-40"
            style={{ background: 'var(--color-bg-3)', border: `1px solid ${filterRoom ? 'var(--color-primary)' : 'var(--color-glass-border)'}`, color: filterRoom ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: filterRoom ? 600 : 400 }}>
            <option value="">Tất cả phòng</option>
            {filterRooms.map((r: any) => (
              <option key={r._id} value={r._id}>{r.name} ({r.totalSeats} ghế · {r.type?.toUpperCase()})</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--color-glass-border)' }} />

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: '', label: 'Tất cả phim' },
            { value: 'now_showing', label: '🟢 Đang chiếu' },
            { value: 'coming_soon', label: '🔵 Sắp chiếu' },
            { value: 'ended', label: '⚫ Kết thúc' },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => { setFilterStatus(value); setFilterMovie('') }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: filterStatus === value ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-3)', color: filterStatus === value ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${filterStatus === value ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
              {label}
            </button>
          ))}
        </div>

        {/* Reset all filters */}
        {(filterTheater || filterRoom || filterStatus || filterMovie) && (
          <button onClick={() => { setFilterTheater(''); setFilterRoom(''); setFilterRooms([]); setFilterStatus(''); setFilterMovie('') }}
            className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Movie chips */}
      {filteredMovies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setFilterMovie('')}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: !filterMovie ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)', color: !filterMovie ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${!filterMovie ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
            Tất cả
          </button>
          {filteredMovies.map((m: any) => (
            <button key={m._id} onClick={() => setFilterMovie(m._id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{ background: filterMovie === m._id ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)', color: filterMovie === m._id ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${filterMovie === m._id ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: movieColorMap[m._id] }} />
              {m.title?.slice(0, 20)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : viewMode === 'weekly' ? (
        <WeeklyView />
      ) : viewMode === 'timeline' ? (
        <TimelineView />
      ) : (
        /* List view */
        list.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <Calendar className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-text-dim)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Chưa có suất chiếu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((s: any, i: number) => {
              const color = movieColorMap[s.movie?._id] || '#A855F7'
              return (
                <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', borderLeft: `3px solid ${color}` }}>
                  {s.movie?.poster && <img src={s.movie.poster} alt="" className="w-10 h-14 object-cover rounded-xl flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{s.movie?.title}</div>
                    <div className="text-xs mt-0.5 flex flex-wrap gap-2" style={{ color: 'var(--color-text-muted)' }}>
                      <span>📅 {s.startTime ? fmtDT(s.startTime) : '—'}</span>
                      <span>🏛 {s.theater?.name}</span>
                      <span>🚪 {s.room?.name}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {s.format && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: `${FORMAT_COLORS[s.format] || color}22`, color: FORMAT_COLORS[s.format] || color, border: `1px solid ${FORMAT_COLORS[s.format] || color}44` }}>
                          {s.format}
                        </span>
                      )}
                      {s.language && (
                        <span className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary-light)', border: '1px solid rgba(168,85,247,0.2)' }}>
                          {LANG_LABELS[s.language] || s.language}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(252,211,77,0.1)', color: 'var(--color-gold)' }}>
                        {(s.basePrice || s.priceStandard || 0).toLocaleString('vi')}đ
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm('Xóa suất chiếu này?')) del(s._id) }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(244,63,94,0.3)' }}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Xác nhận xóa</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Xóa <span className="font-bold" style={{ color: '#F43F5E' }}>{list.length} suất chiếu</span>
                {filterMovie ? ' của phim đã chọn' : filterStatus ? ' theo bộ lọc hiện tại' : ' (tất cả)'}?
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-dim)' }}>Hành động này không thể hoàn tác!</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                Hủy
              </button>
              <button onClick={() => delBulk()} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: 'rgba(244,63,94,0.15)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.4)' }}>
                {deleting ? '⏳ Đang xóa...' : `🗑 Xóa ${list.length} suất`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-md rounded-2xl p-6 pointer-events-auto overflow-y-auto"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxHeight: '90vh' }}>
                <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Plus className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /> Thêm Suất Chiếu
                </h2>

                <div className="space-y-3">
                  {/* Phim */}
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Phim *</label>
                    <select value={form.movie} onChange={set('movie')} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S}>
                      <option value="">-- Chọn phim --</option>
                      {(movies || []).map((m: any) => <option key={m._id} value={m._id}>{m.title} ({m.duration}p)</option>)}
                    </select>
                  </div>

                  {/* Rạp */}
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Rạp *</label>
                    <select value={form.theater} onChange={e => loadRooms(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S}>
                      <option value="">-- Chọn rạp --</option>
                      {(theaters || []).map((t: any) => <option key={t._id} value={t._id}>{t.name} - {t.city}</option>)}
                    </select>
                  </div>

                  {/* Phòng */}
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Phòng chiếu *</label>
                    <select value={form.room} onChange={set('room')} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S}
                      disabled={!form.theater}>
                      <option value="">-- {form.theater ? (rooms.length ? 'Chọn phòng' : 'Chưa có phòng') : 'Chọn rạp trước'} --</option>
                      {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.name} ({r.totalSeats} ghế · {r.type?.toUpperCase()})</option>)}
                    </select>
                    {form.theater && rooms.length === 0 && (
                      <p className="text-xs mt-1" style={{ color: '#F43F5E' }}>
                        ⚠️ Rạp này chưa có phòng. <a href="/admin/rooms" className="underline" style={{ color: 'var(--color-primary)' }}>Tạo phòng tại đây</a>
                      </p>
                    )}
                  </div>

                  {/* Thời gian */}
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Thời gian bắt đầu *</label>
                    <input type="datetime-local" value={form.startTime} onChange={set('startTime')}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S} />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-muted)' }}>Định dạng</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['2D', '3D', 'IMAX', '4DX'].map(f => (
                        <button key={f} type="button" onClick={() => setForm((prev: any) => ({ ...prev, format: f }))}
                          className="py-2 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: form.format === f ? `${FORMAT_COLORS[f]}22` : 'var(--color-bg-3)',
                            border: `1.5px solid ${form.format === f ? FORMAT_COLORS[f] : 'var(--color-glass-border)'}`,
                            color: form.format === f ? FORMAT_COLORS[f] : 'var(--color-text-muted)',
                          }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-muted)' }}>Ngôn ngữ</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'sub', label: 'Vietsub', emoji: '🇻🇳' },
                        { value: 'dub', label: 'Lồng tiếng', emoji: '🎙️' },
                        { value: 'original', label: 'Nguyên bản', emoji: '🌐' },
                      ].map(({ value, label, emoji }) => (
                        <button key={value} type="button" onClick={() => setForm((prev: any) => ({ ...prev, language: value }))}
                          className="py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5"
                          style={{
                            background: form.language === value ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-3)',
                            border: `1.5px solid ${form.language === value ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                            color: form.language === value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          }}>
                          <span>{emoji}</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Giá vé */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Giá vé (VND)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'basePrice', label: '🪑 Thường', color: '#60A5FA' },
                        { key: 'priceVip', label: '👑 VIP', color: '#A78BFA' },
                        { key: 'priceDouble', label: '💑 Đôi', color: '#34D399' },
                        { key: 'priceRecliner', label: '🛋 Recliner', color: '#FB923C' },
                      ].map(({ key, label, color }) => (
                        <div key={key}>
                          <label className="text-xs mb-1 block font-medium" style={{ color }}>{label}</label>
                          <input type="number" value={form[key]} onChange={set(key)} step="5000"
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={S} />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-dim)' }}>
                      ⏱ Thời gian kết thúc tự tính theo độ dài phim + 30p dọn dẹp
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowForm(false); setForm(EMPTY); setRooms([]) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                    Hủy
                  </button>
                  <button onClick={() => create()} disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
                    {isPending ? '⏳ Đang tạo...' : '✅ Tạo Suất'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}