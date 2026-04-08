import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { User, Mail, Phone, Save, Camera, Ticket, Star, Calendar, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api, { bookingApi } from '../api'
import toast from 'react-hot-toast'

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác']
const TIER_CONFIG = {
  bronze:   { label: 'Đồng',     color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  icon: '🥉', next: 'Bạc',    nextPoints: 500,  gradient: 'linear-gradient(135deg,#CD7F32,#A0522D)' },
  silver:   { label: 'Bạc',      color: '#A8A9AD', bg: 'rgba(192,192,192,0.15)', icon: '🥈', next: 'Vàng',   nextPoints: 2000, gradient: 'linear-gradient(135deg,#C0C0C0,#808080)' },
  gold:     { label: 'Vàng',     color: '#FFD700', bg: 'rgba(255,215,0,0.15)',   icon: '🥇', next: 'Kim Cương', nextPoints: 5000, gradient: 'linear-gradient(135deg,#FFD700,#FFA500)' },
  platinum: { label: 'Kim Cương', color: 'var(--color-primary)', bg: 'rgba(168,85,247,0.15)', icon: '💎', next: null,     nextPoints: 0,    gradient: 'linear-gradient(135deg,var(--color-primary),#A78BFA)' },
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [tab, setTab] = useState<'info' | 'security' | 'bookings'>('info')
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: '',
    birthday: '',
    gender: 'Nam',
    avatar: user?.avatar || '',
  })

  // Load đầy đủ profile từ API (có phone, birthday, gender)
  const { data: profileData } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/profile'),
    select: (d: any) => d.data.data,
  })

  useEffect(() => {
    if (!profileData) return
    setForm({
      name: (profileData as any).name || '',
      phone: (profileData as any).phone || '',
      birthday: (profileData as any).birthday ? new Date((profileData as any).birthday).toISOString().split('T')[0] : '',
      gender: (profileData as any).gender || 'Nam',
      avatar: (profileData as any).avatar || '',
    })
  }, [profileData])
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Load bookings
  const { data: bookingsData } = useQuery({
    queryKey: ['my-bookings-profile'],
    queryFn: () => bookingApi.getMy(),
    select: d => d.data.data,
    enabled: tab === 'bookings',
  })

  // Load loyalty points
  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => api.get('/coupons/loyalty'),
    select: d => d.data.data,
  })

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () => api.put('/users/profile', { name: form.name, phone: form.phone, avatar: form.avatar, birthday: form.birthday || undefined, gender: form.gender }),
    onSuccess: ({ data }) => {
      updateUser(data.data)
      // Sync lại form để không bị mất thông tin
      setForm({
        name: data.data.name || '',
        phone: data.data.phone || '',
        birthday: data.data.birthday ? new Date(data.data.birthday).toISOString().split('T')[0] : '',
        gender: data.data.gender || 'Nam',
        avatar: data.data.avatar || '',
      })
      toast.success('✅ Đã cập nhật hồ sơ!')
    },
    onError: () => toast.error('Cập nhật thất bại'),
  })

  const { mutate: changePw, isPending: changingPw } = useMutation({
    mutationFn: () => api.put('/users/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw }),
    onSuccess: () => { toast.success('✅ Đổi mật khẩu thành công!'); setPwForm({ current: '', newPw: '', confirm: '' }) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi đổi mật khẩu'),
  })

  const bookings = (bookingsData as any[]) || []
  const loyalty = loyaltyData as any
  const tier = TIER_CONFIG[loyalty?.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze
  const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'checked_in').length

  const TABS = [
    { id: 'info', label: 'Thông Tin', icon: User },
    { id: 'security', label: 'Bảo Mật', icon: Lock },
    { id: 'bookings', label: 'Lịch Sử Vé', icon: Ticket },
  ]

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
  const inputStyle = { background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = 'var(--color-primary)'
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = 'var(--color-glass-border)'

  return (
    <div className="min-h-screen pt-20 pb-12" style={{ background: 'var(--color-bg)' }}>
      {/* Hero Banner */}
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #0F2744 0%, #0F172A 40%, #0C2338 70%, #1a1040 100%)' }} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 80% 50%, #FDE68A 0%, transparent 50%)' }} />
        {/* Film strip decoration */}
        <div className="absolute top-4 left-0 right-0 flex gap-3 opacity-10 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-8 h-6 border-2 rounded-sm" style={{ borderColor: 'white' }} />
          ))}
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex gap-3 opacity-10 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-8 h-6 border-2 rounded-sm" style={{ borderColor: 'white' }} />
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ── Profile Header ── */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="relative -mt-16 mb-6 rounded-3xl overflow-hidden"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          <div className="flex flex-col sm:flex-row items-stretch">

            {/* LEFT: avatar + info */}
            <div className="flex-1 p-5 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-3xl font-black overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>
                  {form.avatar ? <img src={form.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0).toUpperCase()}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'var(--color-primary)' }}>
                  <Camera className="w-3 h-3" style={{ color: 'white' }} />
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setForm(f => ({ ...f, avatar: reader.result as string }))
                    reader.readAsDataURL(file)
                  }} />
                </label>
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-xl truncate" style={{ color: 'var(--color-text)' }}>{user?.name}</h1>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mt-2"
                  style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <img src="/logo.svg" alt="" style={{ width:13,height:13 }} />
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'staff' ? 'Nhân Viên' : 'Thành Viên'}
                </span>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="hidden sm:block w-px self-stretch" style={{ background: 'var(--color-glass-border)' }} />

            {/* CENTER: stats */}
            <div className="flex sm:flex-col justify-center gap-6 sm:gap-0 px-6 py-4 sm:py-5">
              <div className="text-center">
                <div className="font-black text-2xl" style={{ color: 'var(--color-primary)' }}>{confirmedBookings}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Vé đã đặt</div>
              </div>
              <div className="hidden sm:block h-px my-3" style={{ background: 'var(--color-glass-border)' }} />
              <div className="text-center">
                <div className="font-black text-2xl" style={{ color: '#FDE68A' }}>{(loyalty?.points || 0).toLocaleString()}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Điểm tích lũy</div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="hidden sm:block w-px self-stretch" style={{ background: 'var(--color-glass-border)' }} />

            {/* RIGHT: Membership card — credit-card proportions 85.6 × 54 mm */}
            {loyalty && (() => {
              const TIERS = [
                { id: 'bronze',  from: '#7B3F00', via: '#C8692A', to: '#E8A96A', stripe: '#F5C98A', glow: '#C8692A' },
                { id: 'silver',  from: '#1a1a2e', via: '#404060', to: '#9B9BB0', stripe: '#C8C8D8', glow: '#A0A0C0' },
                { id: 'gold',    from: '#5C3A00', via: '#C07800', to: '#FFD060', stripe: '#FFE898', glow: '#FFB800' },
                { id: 'platinum',from: '#0A1628', via: '#103060', to: '#30A8E0', stripe: '#90D8FF', glow: 'var(--color-primary)' },
              ]
              const tc = TIERS.find(t => t.id === (loyalty.tier || 'bronze')) || TIERS[0]
              const pct = tier.nextPoints ? Math.min(100, Math.round((loyalty.points / tier.nextPoints) * 100)) : 100
              const cardW = 320, cardH = Math.round(cardW / 1.586)

              return (
                <div className="flex-shrink-0 flex items-center justify-center p-5">
                  <svg width={cardW} height={cardH} viewBox={`0 0 ${cardW} ${cardH}`} style={{ borderRadius: 14, boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 32px ${tc.glow}55`, display:'block' }}>
                    <defs>
                      {/* Base gradient */}
                      <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%"   stopColor={tc.from} />
                        <stop offset="45%"  stopColor={tc.via} />
                        <stop offset="100%" stopColor={tc.to} />
                      </linearGradient>
                      {/* Holographic sheen */}
                      <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="60%">
                        <stop offset="0%"   stopColor="white" stopOpacity="0" />
                        <stop offset="35%"  stopColor="white" stopOpacity="0.12" />
                        <stop offset="50%"  stopColor="white" stopOpacity="0.22" />
                        <stop offset="65%"  stopColor="white" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                      {/* Progress bar gradient */}
                      <linearGradient id="progBar" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor={tc.stripe} stopOpacity="0.9" />
                        <stop offset="100%" stopColor="white"     stopOpacity="0.7" />
                      </linearGradient>
                      <clipPath id="cardClip">
                        <rect width={cardW} height={cardH} rx="14" ry="14" />
                      </clipPath>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                    </defs>

                    <g clipPath="url(#cardClip)">
                      {/* BG */}
                      <rect width={cardW} height={cardH} fill="url(#cardBg)" />

                      {/* Dot texture */}
                      {Array.from({length:12}).map((_,row) =>
                        Array.from({length:22}).map((_,col) => (
                          <circle key={`d${row}-${col}`}
                            cx={col*16+8} cy={row*16+8} r="1"
                            fill="white" opacity="0.04" />
                        ))
                      )}

                      {/* Big circle decoration BR */}
                      <circle cx={cardW+20} cy={cardH+20} r={cardH*0.95} fill="none" stroke="white" strokeWidth="1" opacity="0.07" />
                      <circle cx={cardW+20} cy={cardH+20} r={cardH*0.65} fill="none" stroke="white" strokeWidth="1" opacity="0.05" />

                      {/* Sheen */}
                      <rect width={cardW} height={cardH} fill="url(#sheen)" />

                      {/* ── TOP ROW ── */}
                      {/* Logo icon */}
                      <image href="/logo.svg" x="18" y="14" width="28" height="28"
                        style={{ filter:'brightness(0) invert(1)' }} opacity="0.92" />
                      {/* Brand name */}
                      <text x="52" y="32" fontFamily="system-ui,sans-serif" fontWeight="800"
                        fontSize="11" letterSpacing="2" fill="white" opacity="0.9">POPCORN CINEMA</text>

                      {/* Chip */}
                      <rect x={cardW-54} y="14" width="36" height="26" rx="4"
                        fill="none" stroke="white" strokeWidth="1" opacity="0.35" />
                      <rect x={cardW-54} y="14" width="36" height="26" rx="4"
                        fill="white" opacity="0.08" />
                      {/* Chip lines */}
                      <line x1={cardW-54} y1="24" x2={cardW-18} y2="24" stroke="white" strokeWidth="0.5" opacity="0.2" />
                      <line x1={cardW-54} y1="30" x2={cardW-18} y2="30" stroke="white" strokeWidth="0.5" opacity="0.2" />
                      <line x1={cardW-44} y1="14" x2={cardW-44} y2="40" stroke="white" strokeWidth="0.5" opacity="0.2" />
                      <line x1={cardW-36} y1="14" x2={cardW-36} y2="40" stroke="white" strokeWidth="0.5" opacity="0.2" />

                      {/* ── MIDDLE: Tier icon + name ── */}
                      <text x={cardW/2} y={cardH/2 - 10} textAnchor="middle"
                        fontSize="30" filter="url(#glow)">{tier.icon}</text>
                      <text x={cardW/2} y={cardH/2 + 16} textAnchor="middle"
                        fontFamily="system-ui,sans-serif" fontWeight="900"
                        fontSize="18" letterSpacing="6" fill="white" opacity="0.95"
                        style={{ textTransform:'uppercase' }}>{tier.label.toUpperCase()}</text>

                      {/* Decorative stripe under tier name */}
                      <rect x={cardW/2-28} y={cardH/2+22} width="56" height="2" rx="1" fill={tc.stripe} opacity="0.6" />

                      {/* ── BOTTOM ROW ── */}
                      {/* Member name */}
                      <text x="18" y={cardH-30} fontFamily="system-ui,sans-serif" fontWeight="700"
                        fontSize="10" letterSpacing="1.5" fill="white" opacity="0.5">MEMBER NAME</text>
                      <text x="18" y={cardH-14} fontFamily="system-ui,sans-serif" fontWeight="800"
                        fontSize="12" letterSpacing="1.5" fill="white" opacity="0.92">
                        {(user?.name || '').toUpperCase().substring(0,22)}
                      </text>

                      {/* Points */}
                      <text x={cardW-18} y={cardH-30} textAnchor="end"
                        fontFamily="system-ui,sans-serif" fontWeight="700"
                        fontSize="10" letterSpacing="1.5" fill="white" opacity="0.5">ĐIỂM</text>
                      <text x={cardW-18} y={cardH-14} textAnchor="end"
                        fontFamily="system-ui,sans-serif" fontWeight="800"
                        fontSize="12" fill="white" opacity="0.92">
                        {loyalty.points.toLocaleString()}
                      </text>

                      {/* Progress bar */}
                      {tier.next && (
                        <>
                          <rect x="18" y={cardH-8} width={cardW-36} height="3" rx="1.5" fill="black" opacity="0.3" />
                          <rect x="18" y={cardH-8} width={Math.round((cardW-36)*pct/100)} height="3" rx="1.5" fill="url(#progBar)" />
                        </>
                      )}

                      {/* Top edge gloss */}
                      <rect x="0" y="0" width={cardW} height="1" fill="white" opacity="0.18" />
                    </g>
                  </svg>

                  {/* Card drop shadow */}
                  <div style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', width:cardW*0.85, height:16, background:tc.glow, filter:'blur(20px)', opacity:0.35, borderRadius:'50%', pointerEvents:'none' }} />
                </div>
              )
            })()}
          </div>
        </motion.div>

                {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === id ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : 'transparent',
                color: tab === id ? 'white' : 'var(--color-text-muted)',
              }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab: Thông tin */}
        {tab === 'info' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <h2 className="font-semibold text-lg mb-6" style={{ color: 'var(--color-text)' }}>Thông Tin Cá Nhân</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type="text" value={form.name} onChange={set('name')} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="Nhập họ tên" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} placeholder="0901234567" />
                </div>
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Ngày sinh (Tùy chọn)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type="date" value={form.birthday} onChange={set('birthday')} className={inputClass} style={{ ...inputStyle, paddingLeft: '2.5rem' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Giới tính (Tùy chọn)</label>
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                      className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: form.gender === g ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-3)',
                        border: `1px solid ${form.gender === g ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                        color: form.gender === g ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Email <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>✓ Đã xác minh</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input readOnly value={user?.email || ''} className={inputClass} style={{ ...inputStyle, cursor: 'not-allowed', opacity: 0.6 }} />
                </div>
              </div>
            </div>

            <motion.button onClick={() => saveProfile()} disabled={isPending}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full mt-6 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.3)' }}>
              <Save className="w-4 h-4" />
              {isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </motion.button>
          </motion.div>
        )}

        {/* Tab: Bảo mật */}
        {tab === 'security' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
            <h2 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>Đổi Mật Khẩu</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Đảm bảo mật khẩu mạnh ít nhất 6 ký tự</p>

            <div className="space-y-4 max-w-md">
              {[
                { key: 'current', label: 'Mật khẩu hiện tại', placeholder: '••••••••' },
                { key: 'newPw', label: 'Mật khẩu mới', placeholder: '••••••••' },
                { key: 'confirm', label: 'Xác nhận mật khẩu mới', placeholder: '••••••••' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                    <input type={showPw ? 'text' : 'password'}
                      value={(pwForm as any)[key]} onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      className={inputClass} style={inputStyle} placeholder={placeholder} onFocus={onFocus} onBlur={onBlur} />
                    {key === 'newPw' && (
                      <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--color-text-dim)' }}>
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <motion.button
                onClick={() => {
                  if (pwForm.newPw !== pwForm.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return }
                  if (pwForm.newPw.length < 6) { toast.error('Mật khẩu ít nhất 6 ký tự'); return }
                  changePw()
                }}
                disabled={changingPw || !pwForm.current || !pwForm.newPw}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                <ShieldCheck className="w-4 h-4" />
                {changingPw ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Tab: Lịch sử vé */}
        {tab === 'bookings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-16 rounded-3xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="text-5xl mb-3">🎬</div>
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Chưa có vé nào</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Đặt vé ngay để trải nghiệm!</p>
              </div>
            ) : bookings.map((b: any, i: number) => {
              const statusCfg: any = {
                confirmed: { label: 'Xác nhận', color: 'var(--color-primary)' },
                pending: { label: 'Chờ TT', color: '#FDE68A' },
                cancelled: { label: 'Đã hủy', color: '#F87171' },
                checked_in: { label: 'Đã vào rạp', color: 'var(--color-text-muted)' },
              }
              const st = statusCfg[b.status] || statusCfg.pending
              return (
                <motion.div key={b._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex gap-4 p-4 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                  {b.showtime?.movie?.poster && (
                    <img src={b.showtime.movie.poster} alt="" className="w-14 h-20 object-cover rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                        {b.showtime?.movie?.title || 'N/A'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      🏛 {b.showtime?.theater?.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      🎟 Ghế: <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{b.seatLabels?.join(', ')}</span>
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-xs" style={{ color: 'var(--color-text-dim)' }}>{b.bookingCode}</span>
                      <span className="font-bold text-sm" style={{ color: '#FDE68A' }}>
                        {(b.paidAmount ?? b.totalAmount)?.toLocaleString('vi')}đ
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}