import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Clock, Gift, Copy, Check, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const STATIC_PROMOTIONS = [
  { id: 's1', emoji: '🎓', title: 'Ưu đãi Học sinh - Sinh viên', desc: 'Giảm 20% giá vé khi xuất trình thẻ học sinh/sinh viên hợp lệ tại quầy.', tag: 'Cả tuần', color: '#A855F7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', valid: 'Áp dụng tất cả suất chiếu' },
  { id: 's2', emoji: '👫', title: 'Combo Cặp Đôi', desc: 'Mua 2 vé bất kỳ tặng 1 phần bắp nước miễn phí. Áp dụng cuối tuần.', tag: 'Cuối tuần', color: '#F472B6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)', valid: 'Thứ 7 & Chủ nhật' },
  { id: 's3', emoji: '🌅', title: 'Suất Chiếu Sáng Giá Rẻ', desc: 'Tất cả vé suất chiếu trước 10:00 sáng chỉ từ 60.000đ.', tag: 'Hàng ngày', color: '#FDE68A', bg: 'rgba(253,230,138,0.08)', border: 'rgba(253,230,138,0.25)', valid: 'Suất chiếu trước 10:00' },
  { id: 's4', emoji: '🎂', title: 'Ưu Đãi Sinh Nhật', desc: 'Tặng 1 vé miễn phí trong tháng sinh nhật. Áp dụng cho thành viên đã đăng ký.', tag: 'Tháng sinh nhật', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)', valid: 'Toàn tháng sinh nhật' },
  { id: 's5', emoji: '💎', title: 'Thành Viên Hạng Vàng & Kim Cương', desc: 'Giảm 8–10% mỗi vé + tặng vé miễn phí hàng tháng cho thành viên hạng cao.', tag: 'Thành viên VIP', color: '#FFD700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.25)', valid: 'Tích điểm để lên hạng' },
  { id: 's6', emoji: '📱', title: 'Thanh Toán Online', desc: 'Giảm thêm 5.000đ khi thanh toán qua MoMo hoặc VietQR.', tag: 'Online', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', valid: 'Áp dụng khi đặt vé online' },
]

const EMPTY_FORM = {
  code: '', type: 'percent', value: 10, minOrder: 0,
  maxDiscount: 100000, usageLimit: 100,
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  description: '',
}

export default function PromotionsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const qc = useQueryClient()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(EMPTY_FORM)

  const { data: couponsData } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get('/coupons'),
    select: d => d.data.data,
    enabled: isAdmin,
  })
  const coupons: any[] = couponsData || []

  const { mutate: createCoupon, isPending: creating } = useMutation({
    mutationFn: () => api.post('/coupons', { ...form, code: form.code.toUpperCase() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Đã tạo mã coupon!')
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo coupon'),
  })

  const { mutate: deleteCoupon } = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Đã xóa mã') },
  })

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.success(`Đã copy mã ${code}!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const inputStyle = { background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }
  const now = new Date()

  return (
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)' }}>
            <Gift className="w-4 h-4" /> Ưu đãi & Khuyến mãi
          </div>
          <h1 className="font-display font-bold text-3xl mb-3" style={{ color: 'var(--color-text)' }}>
            🎁 Khuyến Mãi Hấp Dẫn
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Hàng loạt ưu đãi dành riêng cho khách hàng Popcorn Cinema
          </p>
        </motion.div>

        {/* Mã Coupon */}
        {isAdmin && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Tag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /> Mã Giảm Giá
              </h2>
              <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                <Plus className="w-4 h-4" /> Tạo mã mới
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coupons.filter(c => c.isActive && new Date(c.expiresAt) > now).map((c, i) => {
                const usedPct = Math.round(c.usedCount / c.usageLimit * 100)
                const isExpiringSoon = new Date(c.expiresAt).getTime() - now.getTime() < 3 * 86400000
                return (
                  <motion.div key={c._id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(168,85,247,0.25)' }}>
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      <div className="w-4 h-8 rounded-r-full flex-shrink-0" style={{ background: 'var(--color-bg)' }} />
                      <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'rgba(168,85,247,0.2)' }} />
                      <div className="w-4 h-8 rounded-l-full flex-shrink-0" style={{ background: 'var(--color-bg)' }} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-2xl font-black mb-0.5" style={{ color: 'var(--color-primary)' }}>
                            {c.type === 'percent' ? `−${c.value}%` : `−${c.value.toLocaleString('vi')}đ`}
                          </div>
                          {c.description && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.description}</div>}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          {isExpiringSoon && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316' }}>⏳ Sắp hết</span>
                          )}
                          <button onClick={() => deleteCoupon(c._id)}
                            className="p-1.5 rounded-lg"
                            style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="my-3" />
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Đơn tối thiểu {c.minOrder.toLocaleString('vi')}đ</div>
                          <div className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>HSD: {new Date(c.expiresAt).toLocaleDateString('vi-VN')}</div>
                          <div className="flex justify-between text-xs mb-0.5" style={{ color: 'var(--color-text-dim)', width: 120 }}>
                            <span>{c.usedCount}/{c.usageLimit} lượt</span><span>{usedPct}%</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', width: 120 }}>
                            <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? '#F87171' : 'var(--color-primary)' }} />
                          </div>
                        </div>
                        <button onClick={() => copyCode(c.code, c._id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105"
                          style={{ background: 'rgba(168,85,247,0.12)', border: '2px dashed rgba(168,85,247,0.4)', color: 'var(--color-primary)', letterSpacing: 2 }}>
                          {copiedId === c._id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {c.code}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {coupons.length === 0 && (
                <div className="col-span-2 text-center py-8 rounded-2xl"
                  style={{ background: 'var(--color-bg-2)', border: '1px dashed var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                  Chưa có mã giảm giá nào. Bấm "Tạo mã mới" để bắt đầu!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ưu đãi thường xuyên */}
        <h2 className="font-bold text-lg flex items-center gap-2 mb-4" style={{ color: 'var(--color-text)' }}>
          <Gift className="w-5 h-5" style={{ color: '#FDE68A' }} /> Ưu Đãi Thường Xuyên
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STATIC_PROMOTIONS.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: p.bg, border: `1px solid ${p.border}` }}>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{p.emoji}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${p.color}20`, color: p.color }}>{p.tag}</span>
              </div>
              <div>
                <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--color-text)' }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{p.desc}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-auto pt-2" style={{ borderTop: `1px solid ${p.border}` }}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />
                <span className="text-xs" style={{ color: p.color }}>{p.valid}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-10 p-4 rounded-2xl text-center text-sm"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <Tag className="w-4 h-4 inline mr-1.5" style={{ color: 'var(--color-primary)' }} />
          Mã giảm giá nhập tại bước Thanh Toán khi đặt vé.
          {!user && <span> <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Đăng nhập</Link> để sử dụng mã.</span>}
        </motion.div>
      </div>

      {/* Form tạo coupon */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-3xl p-6"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--color-text)' }}>🎟️ Tạo Mã Giảm Giá</h2>
              <div className="space-y-3">
                {[
                  { k: 'code', label: 'Mã coupon', placeholder: 'VD: SUMMER2026', type: 'text' },
                  { k: 'description', label: 'Mô tả', placeholder: 'VD: Khuyến mãi hè 2026', type: 'text' },
                ].map(({ k, label, placeholder, type }) => (
                  <div key={k}>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                    <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder}
                      className={inputClass} style={inputStyle} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Loại</label>
                    <select value={form.type} onChange={set('type')} className={inputClass} style={inputStyle}>
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (đ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Giá trị {form.type === 'percent' ? '(%)' : '(đ)'}</label>
                    <input type="number" value={form.value} onChange={set('value')} className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Đơn tối thiểu (đ)</label>
                    <input type="number" value={form.minOrder} onChange={set('minOrder')} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Giảm tối đa (đ)</label>
                    <input type="number" value={form.maxDiscount} onChange={set('maxDiscount')} className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Số lượt dùng</label>
                    <input type="number" value={form.usageLimit} onChange={set('usageLimit')} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Hết hạn</label>
                    <input type="date" value={form.expiresAt} onChange={set('expiresAt')} className={inputClass} style={inputStyle} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                  Hủy
                </button>
                <motion.button onClick={() => createCoupon()} disabled={creating || !form.code}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                  {creating ? '⏳ Đang tạo...' : '✅ Tạo mã'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}