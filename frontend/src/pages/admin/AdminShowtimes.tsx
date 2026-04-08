import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, Filter } from 'lucide-react'
import api, { showtimeApi, movieApi } from '../../api'
import toast from 'react-hot-toast'

const fmtDT = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const EMPTY = { movie: '', theater: '', room: '', startTime: '', language: 'sub', format: '2D', basePrice: 85000, priceVip: 110000, priceDouble: 180000, priceRecliner: 150000 }

export default function AdminShowtimes() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [rooms, setRooms] = useState<any[]>([])
  const [filterMovie, setFilterMovie] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const { data: showtimes, isLoading } = useQuery({
    queryKey: ['admin-showtimes'],
    queryFn: () => showtimeApi.getAll({ limit: 100 }),
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

  // Load rooms when theater changes
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
      if (!form.movie || !form.theater || !form.room || !form.startTime) {
        throw new Error('Vui lòng điền đầy đủ thông tin')
      }
      const movie = (movies || []).find((m: any) => m._id === form.movie)
      const duration = movie?.duration || 120
      const start = new Date(form.startTime)
      const end = new Date(start.getTime() + (duration + 30) * 60000)
      return api.post('/admin/showtimes', {
        movie: form.movie,
        theater: form.theater,
        room: form.room,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        language: form.language,
        format: form.format,
        basePrice: +form.basePrice,
        priceStandard: +form.basePrice,
        priceVip: +form.priceVip,
        priceDouble: +form.priceDouble,
        priceRecliner: +form.priceRecliner,
        isActive: true,
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
    (!filterStatus || filteredMovies.some((m: any) => m._id === s.movie?._id))
  )

  const S = { background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>Suất Chiếu</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>{list.length}</span>
        </div>
        <div className="flex gap-2">
          {list.length > 0 && (
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)' }}>
              <Trash2 className="w-4 h-4" /> Xóa {list.length} suất
            </button>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
            <Plus className="w-4 h-4" /> Thêm Suất
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'Tất cả phim' },
          { value: 'now_showing', label: '🟢 Đang chiếu' },
          { value: 'coming_soon', label: '🔵 Sắp chiếu' },
          { value: 'ended', label: '⚫ Kết thúc' },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => { setFilterStatus(value); setFilterMovie('') }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: filterStatus === value ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)', color: filterStatus === value ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${filterStatus === value ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filter by movie */}
      {(filteredMovies).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setFilterMovie('')}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: !filterMovie ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)', color: !filterMovie ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${!filterMovie ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
            Tất cả
          </button>
          {filteredMovies.map((m: any) => (
            <button key={m._id} onClick={() => setFilterMovie(m._id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: filterMovie === m._id ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)', color: filterMovie === m._id ? 'var(--color-primary)' : 'var(--color-text-muted)', border: `1px solid ${filterMovie === m._id ? 'var(--color-primary)' : 'var(--color-glass-border)'}` }}>
              {m.title?.slice(0, 20)}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <Calendar className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-text-dim)' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Chưa có suất chiếu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((s: any, i: number) => (
            <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              {s.movie?.poster && <img src={s.movie.poster} alt="" className="w-10 h-14 object-cover rounded-xl flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{s.movie?.title}</div>
                <div className="text-xs mt-0.5 flex flex-wrap gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <span>📅 {s.startTime ? fmtDT(s.startTime) : '—'}</span>
                  <span>🏛 {s.theater?.name}</span>
                  <span>🚪 {s.room?.name}</span>
                </div>
                <div className="flex gap-2 mt-1.5">
                  {[s.format, s.language === 'sub' ? 'Vietsub' : s.language === 'dub' ? 'Lồng tiếng' : 'Nguyên bản'].filter(Boolean).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary-light)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      {tag}
                    </span>
                  ))}
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
          ))}
        </div>
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
                {filterMovie ? ` của phim đã chọn` : filterStatus ? ` theo bộ lọc hiện tại` : ` (tất cả)`}?
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
              <div className="w-full max-w-md rounded-2xl p-6 pointer-events-auto"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
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
                      <option value="">-- {form.theater ? (rooms.length ? 'Chọn phòng' : 'Chưa có phòng (tạo phòng trước)') : 'Chọn rạp trước'} --</option>
                      {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.name} ({r.totalSeats} ghế)</option>)}
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

                  {/* Format + Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Định dạng</label>
                      <select value={form.format} onChange={set('format')} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S}>
                        {['2D', '3D', 'IMAX', '4DX'].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Ngôn ngữ</label>
                      <select value={form.language} onChange={set('language')} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S}>
                        <option value="sub">Vietsub</option>
                        <option value="dub">Lồng tiếng</option>
                        <option value="original">Nguyên bản</option>
                      </select>
                    </div>
                  </div>

                  {/* Giá vé */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Giá vé (VND)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'basePrice',     label: '🪑 Thường',  color: '#60A5FA' },
                        { key: 'priceVip',      label: '👑 VIP',     color: '#A78BFA' },
                        { key: 'priceDouble',   label: '💑 Đôi',     color: '#34D399' },
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