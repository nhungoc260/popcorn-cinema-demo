import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Clock, Gift, Copy, Check, Plus, Trash2, ArrowLeft, X, Calendar, Users, AlertCircle, Ticket, Edit2, Image } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const GRADIENT_OPTIONS = [
  { label: 'Tím', value: 'linear-gradient(135deg, #4C1D95, #7C3AED, #A855F7)', color: '#A855F7' },
  { label: 'Hồng', value: 'linear-gradient(135deg, #831843, #DB2777, #F472B6)', color: '#F472B6' },
  { label: 'Vàng', value: 'linear-gradient(135deg, #78350F, #D97706, #FDE68A)', color: '#FDE68A' },
  { label: 'Xanh lá', value: 'linear-gradient(135deg, #064E3B, #059669, #34D399)', color: '#34D399' },
  { label: 'Vàng kim', value: 'linear-gradient(135deg, #78350F, #B45309, #FFD700)', color: '#FFD700' },
  { label: 'Xanh dương', value: 'linear-gradient(135deg, #1E3A5F, #1D4ED8, #60a5fa)', color: '#60a5fa' },
]

const EMPTY_PROMO_FORM = {
  title: '', description: '', tag: 'Cả tuần', imageUrl: '',
  gradient: GRADIENT_OPTIONS[0].value, color: GRADIENT_OPTIONS[0].color,
  conditions: [''], target: 'Tất cả khách hàng',
  validFrom: '', validTo: '', isActive: true,
  couponCode: '',
}

const EMPTY_COUPON_FORM = {
  code: '', type: 'percent', value: 10, minOrder: 0,
  maxDiscount: 100000, usageLimit: 100,
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  description: '',
}

export default function PromotionsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [couponForm, setCouponForm] = useState<any>(EMPTY_COUPON_FORM)
  const [selectedPromo, setSelectedPromo] = useState<any | null>(null)
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [editingPromo, setEditingPromo] = useState<any | null>(null)
  const [promoForm, setPromoForm] = useState<any>(EMPTY_PROMO_FORM)

  const { data: couponsData } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get('/coupons'),
    select: d => d.data.data,
    enabled: isAdmin,
  })
  const coupons: any[] = couponsData || []

  const { data: promotionsData } = useQuery({
    queryKey: ['promotions-public'],
    queryFn: () => api.get('/promotions'),
    select: d => d.data.data,
  })
  const promotions: any[] = promotionsData || []

  const { mutate: createCoupon, isPending: creatingCoupon } = useMutation({
    mutationFn: () => api.post('/coupons', { ...couponForm, code: couponForm.code.toUpperCase() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Đã tạo mã!'); setShowCouponForm(false); setCouponForm(EMPTY_COUPON_FORM) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi tạo coupon'),
  })
  const { mutate: deleteCoupon } = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Đã xóa mã') },
  })

  const { mutate: createPromo, isPending: creatingPromo } = useMutation({
    mutationFn: () => api.post('/admin/promotions', promoForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions-public'] }); toast.success('Đã tạo ưu đãi!'); setShowPromoForm(false); setPromoForm(EMPTY_PROMO_FORM) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const { mutate: updatePromo, isPending: updatingPromo } = useMutation({
    mutationFn: () => api.put(`/admin/promotions/${editingPromo._id}`, promoForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions-public'] }); toast.success('Đã cập nhật!'); setEditingPromo(null); setShowPromoForm(false) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi'),
  })
  const { mutate: deletePromo } = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/promotions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions-public'] }); toast.success('Đã xóa ưu đãi') },
  })

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code); setCopiedId(id)
    toast.success(`Đã copy mã ${code}!`); setTimeout(() => setCopiedId(null), 2000)
  }

  const setCField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCouponForm((f: any) => ({ ...f, [k]: e.target.value }))
  const setPField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setPromoForm((f: any) => ({ ...f, [k]: e.target.value }))

  const openEditPromo = (p: any) => {
    setEditingPromo(p); setPromoForm({ ...p, conditions: p.conditions?.length ? p.conditions : [''] }); setShowPromoForm(true)
  }
  const openNewPromo = () => { setEditingPromo(null); setPromoForm(EMPTY_PROMO_FORM); setShowPromoForm(true) }

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const inputStyle = { background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }
  const now = new Date()

  return (
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto">

        <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)' }}>
            <Gift className="w-4 h-4" /> Ưu đãi & Khuyến mãi
          </div>
          <h1 className="font-display font-bold text-3xl mb-3" style={{ color: 'var(--color-text)' }}>🎁 Khuyến Mãi Hấp Dẫn</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Hàng loạt ưu đãi dành riêng cho khách hàng Popcorn Cinema</p>
        </motion.div>

        {/* ===== COUPON SECTION (admin only) ===== */}
        {isAdmin && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Tag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /> Mã Giảm Giá
              </h2>
              <button onClick={() => { setShowCouponForm(true); setCouponForm(EMPTY_COUPON_FORM) }}
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
                  <motion.div key={c._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
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
                          {isExpiringSoon && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316' }}>⏳ Sắp hết</span>}
                          <button onClick={() => deleteCoupon(c._id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
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
                  Chưa có mã. Bấm "Tạo mã mới" để bắt đầu!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PROMOTIONS GRID - CGV STYLE ===== */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Gift className="w-5 h-5" style={{ color: '#FDE68A' }} /> Tin Tức & Ưu Đãi
          </h2>
          {isAdmin && (
            <button onClick={openNewPromo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(253,230,138,0.1)', border: '1px solid rgba(253,230,138,0.3)', color: '#FDE68A' }}>
              <Plus className="w-4 h-4" /> Thêm ưu đãi
            </button>
          )}
        </div>

        {/* CGV-style grid: 4 columns on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {promotions.map((p: any, i: number) => (
            <motion.div
              key={p._id || p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-pointer"
              onClick={() => setSelectedPromo(p)}
            >
              {/* Banner image area */}
              <div className="relative rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '3/4' }}>
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-105"
                    style={{ background: p.gradient || 'linear-gradient(135deg,#4C1D95,#7C3AED)' }}
                  >
                    <span className="text-5xl mb-3 drop-shadow-lg">
                      {p.emoji || [...(p.title || '')][0] || '🎁'}
                    </span>
                    <span className="text-white font-bold text-sm text-center px-4 leading-tight drop-shadow">
                      {p.title}
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <span className="text-white text-sm font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                    Xem chi tiết →
                  </span>
                </div>

                {/* Tag badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}>
                    {p.tag}
                  </span>
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditPromo(p)} className="p-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => deletePromo(p._id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.8)', color: 'white' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {p.validFrom && p.validTo
                    ? `${p.validFrom} - ${p.validTo}`
                    : p.validFrom || p.validTo || 'Không giới hạn'}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:underline"
                style={{ color: 'var(--color-text)' }}>
                {p.title}
              </h3>
            </motion.div>
          ))}

          {promotions.length === 0 && (
            <div className="col-span-4 text-center py-16 rounded-2xl"
              style={{ background: 'var(--color-bg-2)', border: '1px dashed var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
              {isAdmin ? 'Chưa có ưu đãi nào. Bấm "Thêm ưu đãi" để tạo!' : 'Chưa có ưu đãi nào.'}
            </div>
          )}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-10 p-4 rounded-2xl text-center text-sm"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
          <Tag className="w-4 h-4 inline mr-1.5" style={{ color: 'var(--color-primary)' }} />
          Mã giảm giá nhập tại bước Thanh Toán khi đặt vé.
          {!user && <span> <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Đăng nhập</Link> để sử dụng mã.</span>}
        </motion.div>
      </div>

      {/* ===== POPUP CHI TIẾT ƯU ĐÃI ===== */}
      <AnimatePresence>
        {selectedPromo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedPromo(null) }}>
            <motion.div
              initial={{ scale: 0.93, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 24, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', maxHeight: '88vh' }}>

              {/* Left: banner image */}
              <div className="relative flex-shrink-0 md:w-56 h-48 md:h-auto"
                style={{ background: selectedPromo.imageUrl ? undefined : (selectedPromo.gradient || 'linear-gradient(135deg,#4C1D95,#7C3AED)') }}>
                {selectedPromo.imageUrl
                  ? <img src={selectedPromo.imageUrl} alt={selectedPromo.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex flex-col items-center justify-center p-6">
                      <div className="text-6xl mb-3">{selectedPromo.emoji || '🎁'}</div>
                      <h2 className="text-white font-bold text-base text-center leading-tight drop-shadow">{selectedPromo.title}</h2>
                    </div>
                }
                {/* Tag overlay */}
                <div className="absolute top-3 left-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(4px)' }}>
                    {selectedPromo.tag}
                  </span>
                </div>
              </div>

              {/* Right: content */}
              <div className="flex-1 overflow-y-auto p-5 relative">
                <button onClick={() => setSelectedPromo(null)}
                  className="absolute top-4 right-4 p-2 rounded-full z-10 transition-colors"
                  style={{ background: 'var(--color-bg-3)', color: 'var(--color-text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>

                <h2 className="font-bold text-lg pr-10 mb-3 leading-tight" style={{ color: 'var(--color-text)' }}>
                  {selectedPromo.title}
                </h2>

                {/* Date */}
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: selectedPromo.color || 'var(--color-primary)' }} />
                  <span>
                    {selectedPromo.validFrom && selectedPromo.validTo
                      ? `${selectedPromo.validFrom} – ${selectedPromo.validTo}`
                      : selectedPromo.validFrom || selectedPromo.validTo || 'Không giới hạn thời gian'}
                  </span>
                </div>

                {/* Description - full text */}
                <p className="text-sm leading-relaxed mb-4"
                  style={{ color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>
                  {selectedPromo.description}
                </p>

                {/* Target */}
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
                  <Users className="w-4 h-4 flex-shrink-0" style={{ color: selectedPromo.color || 'var(--color-primary)' }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>{selectedPromo.target}</span>
                </div>

                {/* Conditions */}
                {selectedPromo.conditions?.filter(Boolean).length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" style={{ color: selectedPromo.color || 'var(--color-primary)' }} />
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Điều kiện áp dụng</span>
                    </div>
                    <ul className="space-y-1.5">
                      {selectedPromo.conditions.filter(Boolean).map((cond: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                            style={{ background: `${selectedPromo.color || '#A855F7'}20`, color: selectedPromo.color || 'var(--color-primary)' }}>{i + 1}</span>
                          {cond}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Coupon code */}
                {selectedPromo.couponCode && (
                  <div className="mb-4 p-3 rounded-xl flex items-center justify-between"
                    style={{ background: 'rgba(168,85,247,0.08)', border: '2px dashed rgba(168,85,247,0.4)' }}>
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>🎟 Mã giảm giá</div>
                      <div className="font-black font-mono text-lg" style={{ color: 'var(--color-primary)' }}>
                        {selectedPromo.couponCode}
                      </div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(selectedPromo.couponCode); toast.success('Đã copy mã!') }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(168,85,247,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.3)' }}>
                      <Copy className="w-3.5 h-3.5" /> Copy mã
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSelectedPromo(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>
                    Đóng
                  </button>
                  <Link to="/movies" onClick={() => setSelectedPromo(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                    <Ticket className="w-4 h-4" /> Đặt vé ngay
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FORM TẠO/SỬA ƯU ĐÃI ===== */}
      <AnimatePresence>
        {showPromoForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowPromoForm(false) }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-lg rounded-3xl p-6 overflow-y-auto"
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', maxHeight: '88vh' }}>
              <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--color-text)' }}>
                {editingPromo ? '✏️ Sửa Ưu Đãi' : '🎁 Thêm Ưu Đãi Mới'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Tên ưu đãi *</label>
                  <input value={promoForm.title} onChange={setPField('title')} placeholder="VD: Ưu đãi Học sinh" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Mô tả *</label>
                  <textarea value={promoForm.description} onChange={setPField('description')} rows={3} placeholder="VD: Giảm 20%..." className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>🎟 Mã coupon áp dụng (nếu có)</label>
                  <input value={promoForm.couponCode} onChange={setPField('couponCode')} placeholder="VD: STUDENT20" className={inputClass} style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Tag hiển thị</label>
                    <input value={promoForm.tag} onChange={setPField('tag')} placeholder="VD: Cả tuần" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Đối tượng</label>
                    <input value={promoForm.target} onChange={setPField('target')} placeholder="VD: Học sinh" className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    <Image className="w-3 h-3 inline mr-1" />URL ảnh banner (để trống → dùng màu gradient)
                  </label>
                  <input value={promoForm.imageUrl} onChange={setPField('imageUrl')} placeholder="https://..." className={inputClass} style={inputStyle} />
                </div>
                {!promoForm.imageUrl && (
                  <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Màu banner</label>
                    <div className="flex gap-2 flex-wrap">
                      {GRADIENT_OPTIONS.map(g => (
                        <button key={g.value} onClick={() => setPromoForm((f: any) => ({ ...f, gradient: g.value, color: g.color }))}
                          className="w-8 h-8 rounded-full border-2 transition-all"
                          style={{ background: g.value, borderColor: promoForm.gradient === g.value ? 'white' : 'transparent', transform: promoForm.gradient === g.value ? 'scale(1.2)' : 'scale(1)' }}
                          title={g.label} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Từ ngày</label>
                    <input value={promoForm.validFrom} onChange={setPField('validFrom')} placeholder="VD: 01/01/2026" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Đến ngày</label>
                    <input value={promoForm.validTo} onChange={setPField('validTo')} placeholder="VD: 31/12/2026" className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Điều kiện áp dụng</label>
                  <div className="space-y-2">
                    {promoForm.conditions.map((cond: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <input value={cond}
                          onChange={e => { const c = [...promoForm.conditions]; c[i] = e.target.value; setPromoForm((f: any) => ({ ...f, conditions: c })) }}
                          placeholder={`Điều kiện ${i + 1}`} className={inputClass} style={inputStyle} />
                        <button onClick={() => { const c = promoForm.conditions.filter((_: string, j: number) => j !== i); setPromoForm((f: any) => ({ ...f, conditions: c.length ? c : [''] })) }}
                          className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setPromoForm((f: any) => ({ ...f, conditions: [...f.conditions, ''] }))}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      + Thêm điều kiện
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowPromoForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>Hủy</button>
                <motion.button onClick={() => editingPromo ? updatePromo() : createPromo()}
                  disabled={creatingPromo || updatingPromo || !promoForm.title}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                  {creatingPromo || updatingPromo ? '⏳ Đang lưu...' : editingPromo ? '✅ Cập nhật' : '✅ Tạo ưu đãi'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FORM TẠO COUPON ===== */}
      <AnimatePresence>
        {showCouponForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowCouponForm(false) }}>
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
                    <input type={type} value={couponForm[k]} onChange={setCField(k)} placeholder={placeholder} className={inputClass} style={inputStyle} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Loại</label>
                    <select value={couponForm.type} onChange={setCField('type')} className={inputClass} style={inputStyle}>
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (đ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Giá trị {couponForm.type === 'percent' ? '(%)' : '(đ)'}</label>
                    <input type="number" value={couponForm.value} onChange={setCField('value')} className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Đơn tối thiểu (đ)</label>
                    <input type="number" value={couponForm.minOrder} onChange={setCField('minOrder')} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Giảm tối đa (đ)</label>
                    <input type="number" value={couponForm.maxDiscount} onChange={setCField('maxDiscount')} className={inputClass} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Số lượt dùng</label>
                    <input type="number" value={couponForm.usageLimit} onChange={setCField('usageLimit')} className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Hết hạn</label>
                    <input type="date" value={couponForm.expiresAt} onChange={setCField('expiresAt')} className={inputClass} style={inputStyle} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCouponForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-muted)' }}>Hủy</button>
                <motion.button onClick={() => createCoupon()} disabled={creatingCoupon || !couponForm.code}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                  {creatingCoupon ? '⏳ Đang tạo...' : '✅ Tạo mã'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}