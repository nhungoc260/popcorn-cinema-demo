import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit, MapPin, Building2 } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

const EMPTY = { name: '', address: '', city: '', phone: '', googleMapsUrl: '', isActive: true }

export default function AdminTheaters() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const { data: theaters, isLoading } = useQuery({
    queryKey: ['admin-theaters'],
    queryFn: () => api.get('/admin/theaters'),
    select: d => d.data.data as any[],
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => editItem
      ? api.put(`/admin/theaters/${editItem._id}`, form)
      : api.post('/admin/theaters', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-theaters'] })
      toast.success(editItem ? '✅ Đã cập nhật rạp!' : '✅ Đã thêm rạp!')
      setShowForm(false); setEditItem(null); setForm(EMPTY)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi lưu rạp'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/theaters/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-theaters'] }); toast.success('Đã xóa rạp') },
  })

  const openEdit = (t: any) => {
    setEditItem(t)
    setForm({ name: t.name, address: t.address, city: t.city, phone: t.phone || '', googleMapsUrl: t.googleMapsUrl || '', isActive: t.isActive })
    setShowForm(true)
  }

  const S = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', color: '#F0EEFF' }
  const list = theaters || []

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          <h1 className="font-display font-bold text-xl" style={{ color: '#F0EEFF' }}>Rạp Chiếu</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>{list.length}</span>
        </div>
        <button onClick={() => { setEditItem(null); setForm(EMPTY); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
          <Plus className="w-4 h-4" /> Thêm Rạp
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((t: any, i: number) => (
            <motion.div key={t._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold text-sm" style={{ color: '#F0EEFF' }}>{t.name}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <MapPin className="w-3 h-3" /> {t.city}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(t)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--color-primary)' }}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Xóa rạp này?')) del(t._id) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.address}</p>
              {t.phone && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>📞 {t.phone}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: t.isActive ? 'rgba(52,211,153,0.12)' : 'rgba(244,63,94,0.1)', color: t.isActive ? '#34D399' : '#F43F5E' }}>
                  {t.isActive ? '🟢 Đang hoạt động' : '🔴 Tạm đóng'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-md rounded-2xl p-6 pointer-events-auto"
                style={{ background: '#13111E', border: '1px solid rgba(168,85,247,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: '#F0EEFF' }}>
                  <Building2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  {editItem ? 'Sửa Rạp Chiếu' : 'Thêm Rạp Chiếu'}
                </h2>
                <div className="space-y-3">
                  {[
                    ['name', 'Tên rạp *', 'text', 'VD: Popcorn Cinema - Quận 1'],
                    ['city', 'Thành phố *', 'text', 'VD: TP. Hồ Chí Minh'],
                    ['address', 'Địa chỉ *', 'text', 'VD: 123 Nguyễn Huệ, Q.1'],
                    ['phone', 'Số điện thoại', 'tel', 'VD: 028-1234-5678'],
                    ['googleMapsUrl', 'Google Maps URL', 'url', 'https://maps.google.com/...'],
                  ].map(([key, label, type, placeholder]) => (
                    <div key={key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</label>
                      <input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={S} />
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <label className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Trạng thái:</label>
                    <button onClick={() => setForm((f: any) => ({ ...f, isActive: !f.isActive }))}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: form.isActive ? 'rgba(52,211,153,0.12)' : 'rgba(244,63,94,0.1)', color: form.isActive ? '#34D399' : '#F43F5E', border: `1px solid ${form.isActive ? '#34D399' : '#F43F5E'}40` }}>
                      {form.isActive ? '🟢 Đang hoạt động' : '🔴 Tạm đóng'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowForm(false); setEditItem(null); setForm(EMPTY) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Hủy
                  </button>
                  <button onClick={() => save()} disabled={saving || !form.name || !form.city || !form.address}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
                    {saving ? '⏳ Đang lưu...' : editItem ? '✅ Cập nhật' : '✅ Thêm rạp'}
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
