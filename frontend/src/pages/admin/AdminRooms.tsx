import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ArrowLeft, Building2, Search, Grid } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

export default function AdminRooms() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterTheater, setFilterTheater] = useState('')

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['admin-rooms', filterTheater],
    queryFn: () => api.get(`/admin/rooms${filterTheater ? `?theaterId=${filterTheater}` : ''}`),
    select: d => d.data.data,
  })
  const { data: theatersData } = useQuery({
    queryKey: ['theaters-admin'],
    queryFn: () => api.get('/admin/theaters'),
    select: d => d.data.data,
  })

  const { mutate: deleteRoom } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/rooms/${id}`),
    onSuccess: () => { toast.success('Đã xoá phòng'); qc.invalidateQueries({ queryKey: ['admin-rooms'] }) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi xoá'),
  })

  const rooms: any[] = (roomsData as any[] || []).filter((r: any) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.theater?.name?.toLowerCase().includes(search.toLowerCase())
  )
  const theaters: any[] = (theatersData as any[]) || []

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="border-b border-b px-6 py-4 flex items-center gap-3"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <Link to="/admin"><ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} /></Link>
        <Building2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
        <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Quản Lý Phòng Chiếu</h1>
        <div className="ml-auto">
          <Link to="/admin/seat-designer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white' }}>
            <Plus className="w-4 h-4" /> Tạo Phòng Mới
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm phòng..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
          </div>
          <select value={filterTheater} onChange={e => setFilterTheater(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
            <option value="">Tất cả rạp</option>
            {theaters.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.7)' }}>Đang tải...</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room: any) => (
              <motion.div key={room._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold" style={{ color: 'var(--color-text)' }}>{room.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {room.theater?.name} · {room.theater?.city}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold capitalize"
                    style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)' }}>{room.type}</span>
                </div>

                {/* Mini seat preview */}
                {room.seats?.length > 0 && (
                  <div className="mb-3 p-2 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {(() => {
                      const rows: Record<string, any[]> = {}
                      room.seats.forEach((s: any) => { if (!rows[s.row]) rows[s.row] = []; rows[s.row].push(s) })
                      const rowKeys = Object.keys(rows).sort()
                      const cols = Math.max(...room.seats.map((s: any) => s.number), 1)
                      const COLORS: Record<string, string> = { standard: '#1E3A5F', vip: '#2D1B4E', couple: '#1A3020', aisle: 'transparent' }
                      const BORDERS: Record<string, string> = { standard: 'var(--color-primary)', vip: '#A78BFA', couple: '#34D399', aisle: 'transparent' }
                      return rowKeys.slice(0, 6).map(r => (
                        <div key={r} className="flex gap-px mb-px justify-center">
                          {rows[r].sort((a: any, b: any) => a.number - b.number).map((s: any) => (
                            <div key={s.number} style={{ width: Math.max(4, Math.min(10, 140/cols)), height: 4, borderRadius: 1, background: COLORS[s.type] || '#1E3A5F', border: `0.5px solid ${BORDERS[s.type] || 'var(--color-primary)'}`, opacity: s.isAisle ? 0.2 : 1 }} />
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  {[
                    { label: 'Hàng', val: room.rows },
                    { label: 'Cột', val: room.cols },
                    { label: 'Ghế', val: room.totalSeats },
                  ].map(({ label, val }) => (
                    <div key={label} className="py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>{val}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Link to={`/admin/seat-designer/${room._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.25)' }}>
                    <Grid className="w-3.5 h-3.5" /> Thiết Kế
                  </Link>
                  <Link to={`/admin/seat-designer/${room._id}`}
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--color-text-muted)', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => { if (confirm('Xoá phòng này?')) deleteRoom(room._id) }}
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
