import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, MapPin, Film, Calendar, Clock, Ticket } from 'lucide-react'
import { movieApi, theaterApi, showtimeApi } from '../../api'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]
const nextDays = (n: number) => {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      value: d.toISOString().split('T')[0],
      label: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
    }
  })
}

interface SelectProps {
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}

function Select({ icon, placeholder, value, onChange, options, disabled }: SelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all text-left"
        style={{
          background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${open ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`,
          color: selected ? 'var(--color-text)' : 'var(--color-text-dim)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span className="flex-shrink-0" style={{ color: 'var(--color-primary)' }}>{icon}</span>
        <span className="flex-1 truncate">{selected?.label || placeholder}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-dim)' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(168,85,247,0.2)', maxHeight: 220, overflowY: 'auto' }}>
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-white/5"
                style={{ color: opt.value === value ? 'var(--color-primary)' : 'var(--color-text-muted)', background: opt.value === value ? 'rgba(168,85,247,0.08)' : 'transparent' }}>
                {opt.label}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--color-text-dim)' }}>Không có dữ liệu</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function QuickBooking() {
  const navigate = useNavigate()
  const [selectedTheater, setSelectedTheater] = useState('')
  const [selectedMovie, setSelectedMovie] = useState('')
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedShowtime, setSelectedShowtime] = useState('')

  const { data: theatersData } = useQuery({
    queryKey: ['theaters'],
    queryFn: () => theaterApi.getAll(),
    select: d => d.data.data,
  })

  const { data: moviesData } = useQuery({
    queryKey: ['movies-showing'],
    queryFn: () => movieApi.getAll({ status: 'now_showing', limit: 50 }),
    select: d => d.data.data,
  })

  const { data: showtimesData } = useQuery({
    queryKey: ['quick-showtimes', selectedMovie, selectedTheater, selectedDate],
    queryFn: () => showtimeApi.getAll({
      movieId: selectedMovie || undefined,
      theaterId: selectedTheater || undefined,
      date: selectedDate,
    }),
    enabled: !!(selectedMovie || selectedTheater),
    select: d => d.data.data,
  })

  const theaters = (theatersData as any[]) || []
  const movies = (moviesData as any[]) || []
  const showtimes = (showtimesData as any[]) || []

  const theaterOptions = theaters.map((t: any) => ({
    value: t._id,
    label: `${t.name} – ${t.city}`
  }))

  const movieOptions = movies.map((m: any) => ({
    value: m._id,
    label: m.title
  }))

  const dateOptions = nextDays(5)

  const showtimeOptions = showtimes.map((s: any) => ({
    value: s._id,
    label: `${new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${s.room?.name} – ${s.format}`
  }))

  const handleBook = () => {
    if (!selectedShowtime) {
      if (!selectedMovie) { toast.error('Vui lòng chọn phim'); return }
      if (!selectedTheater) { toast.error('Vui lòng chọn rạp'); return }
      toast.error('Vui lòng chọn suất chiếu')
      return
    }
    navigate(`/seats/${selectedShowtime}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full rounded-3xl p-5 sm:p-6"
      style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(168,85,247,0.2)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(168,85,247,0.15)' }}>
          <Ticket className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h3 className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>
          Đặt Vé Nhanh
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Select
          icon={<MapPin className="w-4 h-4" />}
          placeholder="1. Chọn Rạp"
          value={selectedTheater}
          onChange={v => { setSelectedTheater(v); setSelectedShowtime('') }}
          options={theaterOptions}
        />
        <Select
          icon={<Film className="w-4 h-4" />}
          placeholder="2. Chọn Phim"
          value={selectedMovie}
          onChange={v => { setSelectedMovie(v); setSelectedShowtime('') }}
          options={movieOptions}
        />
        <Select
          icon={<Calendar className="w-4 h-4" />}
          placeholder="3. Chọn Ngày"
          value={selectedDate}
          onChange={v => { setSelectedDate(v); setSelectedShowtime('') }}
          options={dateOptions}
        />
        <Select
          icon={<Clock className="w-4 h-4" />}
          placeholder="4. Chọn Suất"
          value={selectedShowtime}
          onChange={setSelectedShowtime}
          options={showtimeOptions}
          disabled={!selectedMovie && !selectedTheater}
        />
      </div>

      <motion.button
        onClick={handleBook}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.35)' }}
      >
        🎟 ĐẶT NGAY
      </motion.button>
    </motion.div>
  )
}
