import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, Search, ArrowLeft, Star } from 'lucide-react'
import { movieApi } from '../../api'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  title: '', titleEn: '', description: '', poster: '', backdrop: '', trailer: '',
  duration: 120, genres: '', director: '', cast: '', ageRating: 'P',
  status: 'now_showing', language: 'Tiếng Việt', country: '', subtitle: 'vietsub', note: '', releaseDate: '',
}

// Badge trạng thái phim — thêm "suspended"
const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  now_showing:  { label: 'Đang chiếu',   color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  coming_soon:  { label: 'Sắp chiếu',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  ended:        { label: 'Đã kết thúc',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  suspended:    { label: 'Ngưng chiếu',  color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
}

export default function AdminMovies() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editMovie, setEditMovie] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-movies', search],
    queryFn: () => movieApi.getAll({ page: 1, limit: 50 }),
    select: d => d.data.data,
  })

  const movies = (data as any[]) || []
  const filtered = movies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => editMovie
      ? movieApi.update(editMovie._id, { ...form, genres: form.genres.split(',').map((s: string) => s.trim()), cast: form.cast.split(',').map((s: string) => ({ name: s.trim() })).filter((c: any) => c.name) })
      : movieApi.create({ ...form, genres: form.genres.split(',').map((s: string) => s.trim()), cast: form.cast.split(',').map((s: string) => ({ name: s.trim() })).filter((c: any) => c.name) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-movies'] })
      toast.success(editMovie ? 'Đã cập nhật phim!' : 'Đã thêm phim!')
      setShowForm(false)
      setEditMovie(null)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Lỗi khi lưu phim'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: string) => movieApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-movies'] }); toast.success('Đã xóa phim') },
  })

  const openEdit = (m: any) => {
    setEditMovie(m)
    setForm({ ...m, genres: m.genres?.join(', ') || '', cast: m.cast?.map((c: any) => c.name || c).join(', ') || '', releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString().split('T')[0] : '' })
    setShowForm(true)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
  const inputStyle = { background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-sm transition-colors hover:text-white" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>🎬 Quản Lý Phim</h1>
          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)' }}>
            {filtered.length}
          </span>
        </div>
        <button onClick={() => { setShowForm(true); setEditMovie(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
          <Plus className="w-4 h-4" /> Thêm Phim
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm phim..."
            className="w-full max-w-md pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
        </div>

        {/* Movies grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((m: any, i: number) => {
              const badge = STATUS_BADGE[m.status]
              return (
                <motion.div key={m._id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className="group relative rounded-2xl overflow-hidden"
                  style={{ background: 'var(--color-bg-2)', border: `1px solid ${m.status === 'suspended' ? 'rgba(248,113,113,0.35)' : 'var(--color-glass-border)'}` }}>
                  <div className="aspect-[2/3] relative">
                    {m.poster ? (
                      <img src={m.poster} alt={m.title} className="w-full h-full object-cover" style={{ opacity: m.status === 'suspended' ? 0.5 : 1 }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl"
                        style={{ background: 'var(--color-bg-3)' }}>🎬</div>
                    )}

                    {/* Badge trạng thái — luôn hiển thị góc trên trái */}
                    {badge && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: badge.bg, color: badge.color, backdropFilter: 'blur(4px)' }}>
                        {m.status === 'suspended' && '🚫 '}{badge.label}
                      </div>
                    )}

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2"
                      style={{ background: 'rgba(15,23,42,0.8)' }}>
                      <button onClick={() => openEdit(m)}
                        className="p-2 rounded-xl transition-all hover:scale-110"
                        style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-primary)' }}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`Xóa "${m.title}"?`)) del(m._id) }}
                        className="p-2 rounded-xl transition-all hover:scale-110"
                        style={{ background: 'rgba(248,113,113,0.2)', color: '#F87171' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{m.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-3 h-3 fill-current" style={{ color: '#FDE68A' }} />
                      <span className="text-xs" style={{ color: '#FDE68A' }}>{m.rating}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{m.duration}p</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 scrollbar-thin"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--color-text)' }}>
                {editMovie ? '✏️ Sửa Phim' : '➕ Thêm Phim Mới'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['title', 'Tên phim (VI)', 'text'], ['titleEn', 'Tên phim (EN)', 'text'],
                  ['director', 'Đạo diễn', 'text'], ['cast', 'Diễn viên (cách nhau bằng dấu phẩy)', 'text'], ['genres', 'Thể loại (cách nhau bằng dấu phẩy)', 'text'],
                  ['poster', 'URL Poster (hoặc upload)', 'text'], ['trailer', 'URL Trailer (YouTube)', 'text'],
                  ['duration', 'Thời lượng (phút)', 'number'],
                  ['country', 'Quốc gia', 'text'],
                  ['releaseDate', 'Ngày khởi chiếu', 'date'],
                  ['note', 'Ghi chú (VD: Phim đặc sắc, Suất chiếu đặc biệt...)', 'text'],
                ].map(([key, label, type]) => (
                  <div key={key} className={key === 'poster' || key === 'trailer' || key === 'genres' || key === 'cast' || key === 'note' ? 'col-span-2' : ''}>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                    <input type={type} value={form[key]} onChange={set(key)}
                      className={inputClass} style={inputStyle} />
                    {key === 'poster' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input type="file" accept="image/*" id="poster-file" className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setForm((f: any) => ({ ...f, poster: ev.target?.result as string }));
                            reader.readAsDataURL(file);
                          }} />
                        <label htmlFor="poster-file"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                          style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.25)' }}>
                          📁 Upload ảnh
                        </label>
                        {form.poster?.startsWith('data:') && <span className="text-xs" style={{ color: '#34D399' }}>✅ Ảnh đã chọn</span>}
                        {form.poster && !form.poster.startsWith('data:') && (
                          <img src={form.poster} alt="" className="h-10 rounded object-cover" style={{ width: 30 }} />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* ---- DROPDOWN TRẠNG THÁI — ĐÃ THÊM "Ngưng chiếu" ---- */}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Trạng thái</label>
                  <select value={form.status} onChange={set('status')} className={inputClass} style={inputStyle}>
                    <option value="coming_soon">Sắp chiếu</option>
                    <option value="now_showing">Đang chiếu</option>
                    <option value="ended">Đã kết thúc</option>
                    <option value="suspended">🚫 Ngưng chiếu</option>
                  </select>
                  {/* Cảnh báo khi chọn Ngưng chiếu */}
                  {form.status === 'suspended' && (
                    <p className="text-xs mt-1.5 px-2 py-1.5 rounded-lg"
                      style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                      ⚠️ Tất cả suất chiếu của phim này sẽ bị ẩn ngay lập tức.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Giới hạn tuổi</label>
                  <select value={form.ageRating} onChange={set('ageRating')} className={inputClass} style={inputStyle}>
                    {['P', 'T13', 'T16', 'T18', 'Chưa phân loại'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Phụ đề / Lồng tiếng</label>
                  <select value={form.subtitle} onChange={set('subtitle')} className={inputClass} style={inputStyle}>
                    <option value="vietsub">Vietsub</option>
                    <option value="dubbed">Lồng Tiếng</option>
                    <option value="original">VN</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Mô tả</label>
                  <textarea value={form.description} onChange={set('description')} rows={3}
                    className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                  Hủy
                </button>
                <motion.button onClick={() => save()} disabled={saving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                  {saving ? '⏳ Đang lưu...' : '✅ Lưu Phim'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}