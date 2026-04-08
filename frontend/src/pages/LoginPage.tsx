import { useState, useRef, KeyboardEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Phone, ArrowLeft } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

type LoginMode = 'email' | 'phone'
type PhoneStep = 'input' | 'otp'

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('email')

  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // Phone state
  const [phone, setPhone] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // New user (phone registration)
  const [isNewUser, setIsNewUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [pendingAuth, setPendingAuth] = useState<any>(null)

  const otp = otpDigits.join('')
  const { setAuth, token, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from || '/'

  // Already logged in
  if (token && user) {
    const dest = user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff/counter' : '/'
    navigate(dest, { replace: true })
    return null
  }

  const doRedirect = (u: any) => {
    toast.success(`Chào mừng, ${u.name}! 🎬`)
    if (u.role === 'admin') navigate('/admin', { replace: true })
    else if (u.role === 'staff') navigate('/staff/counter', { replace: true })
    else navigate(from && from !== '/login' ? from : '/', { replace: true })
  }

  // ── Email login ──
  const { mutate: loginEmail, isPending: loggingIn } = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: ({ data }) => {
      const { user: u, access, refresh } = data.data
      setAuth(u, access, refresh)
      doRedirect(u)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Sai email hoặc mật khẩu'),
  })

  // ── Phone: gửi OTP ──
  const { mutate: sendPhoneOtp, isPending: sendingOtp } = useMutation({
    mutationFn: () => authApi.phoneSend(phone),
    onSuccess: () => {
      toast.success(`OTP đã gửi đến ${phone}`)
      setPhoneStep('otp')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Số điện thoại không hợp lệ'),
  })

  // ── Phone: xác nhận OTP ──
  const { mutate: verifyPhoneOtp, isPending: verifying } = useMutation({
    mutationFn: () => authApi.phoneVerify(phone, otp),
    onSuccess: ({ data }) => {
      const { user: u, access, refresh, isNewUser: newU } = data.data
      if (newU) {
        setPendingAuth({ user: u, access, refresh })
        setIsNewUser(true)
        setNewUserName('')
      } else {
        setAuth(u, access, refresh)
        doRedirect(u)
      }
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'OTP sai hoặc hết hạn')
      setOtpDigits(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    },
  })

  // ── Cập nhật tên user mới ──
  const { mutate: updateName, isPending: updatingName } = useMutation({
    mutationFn: () => import('../api').then(({ default: api }) =>
      api.put('/users/profile', { name: newUserName.trim() || pendingAuth?.user?.name })
    ),
    onSuccess: () => {
      if (pendingAuth) {
        const u = { ...pendingAuth.user, name: newUserName.trim() || pendingAuth.user.name }
        setAuth(u, pendingAuth.access, pendingAuth.refresh)
        doRedirect(u)
      }
    },
    onError: () => {
      if (pendingAuth) {
        setAuth(pendingAuth.user, pendingAuth.access, pendingAuth.refresh)
        doRedirect(pendingAuth.user)
      }
    },
  })

  // ── OTP input handlers ──
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const d = [...otpDigits]; d[idx] = val.slice(-1); setOtpDigits(d)
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }
  const handleOtpKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const d = [...otpDigits]; d[idx - 1] = ''; setOtpDigits(d)
      otpRefs.current[idx - 1]?.focus()
    }
  }
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const d = Array(6).fill('')
    text.split('').forEach((ch, i) => { d[i] = ch })
    setOtpDigits(d)
    otpRefs.current[Math.min(text.length, 5)]?.focus()
  }

  const S = {
    background: 'var(--color-bg-3)',
    border: '1px solid var(--color-glass-border)',
    color: 'var(--color-text)',
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>

      {/* BG glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(244,63,94,0.08) 0%,transparent 70%)', filter: 'blur(40px)' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          ← Về trang chủ
        </Link>

        <div className="rounded-3xl p-7"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', boxShadow: '0 4px 24px rgba(168,85,247,0.4)' }}>
              <img src="/logo.svg" alt="" className="w-9 h-9" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--color-text)' }}>Chào Mừng Trở Lại</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Đăng nhập để đặt vé xem phim</p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-5"
            style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}>
            {(['email', 'phone'] as LoginMode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setPhoneStep('input'); setOtpDigits(['','','','','','']); setIsNewUser(false) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: mode === m ? 'linear-gradient(135deg,#A855F7,#7C3AED)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--color-text-muted)',
                  boxShadow: mode === m ? '0 4px 12px rgba(168,85,247,0.35)' : 'none',
                }}>
                {m === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                {m === 'email' ? 'Email' : 'Số điện thoại'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── Email ── */}
            {mode === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email của bạn"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm" style={S}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mật khẩu" onKeyDown={e => e.key === 'Enter' && loginEmail()}
                    className="w-full pl-10 pr-12 py-3 rounded-2xl text-sm" style={S}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-dim)' }}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Quên mật khẩu?
                  </Link>
                </div>
                <motion.button onClick={() => loginEmail()} disabled={loggingIn || !email || !password}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  {loggingIn ? '⏳ Đang đăng nhập...' : '🚀 Đăng Nhập'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Phone: nhập SĐT ── */}
            {mode === 'phone' && phoneStep === 'input' && !isNewUser && (
              <motion.div key="phone-input" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="space-y-4">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="text-sm">🇻🇳</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>+84</span>
                    <div className="w-px h-4 mx-1" style={{ background: 'var(--color-glass-border)' }} />
                  </div>
                  <input type="tel" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0912 345 678"
                    onKeyDown={e => e.key === 'Enter' && phone.length >= 10 && sendPhoneOtp()}
                    className="w-full pl-20 pr-4 py-3 rounded-2xl text-sm font-mono" style={S}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
                </div>
                <motion.button onClick={() => sendPhoneOtp()} disabled={sendingOtp || phone.length < 10}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  {sendingOtp ? '⏳ Đang gửi...' : '📨 Gửi Mã OTP'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Phone: nhập OTP ── */}
            {mode === 'phone' && phoneStep === 'otp' && !isNewUser && (
              <motion.div key="phone-otp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="space-y-5">
                <button onClick={() => { setPhoneStep('input'); setOtpDigits(['','','','','','']) }}
                  className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <ArrowLeft className="w-4 h-4" /> {phone}
                </button>
                <div>
                  <p className="text-xs text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Nhập mã 6 chữ số gửi đến <strong>{phone}</strong>
                  </p>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <motion.input key={idx}
                        ref={el => { otpRefs.current[idx] = el }}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKey(idx, e)}
                        onFocus={e => {
                          e.target.select()
                          e.currentTarget.style.borderColor = 'var(--color-primary)'
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.2)'
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = digit ? 'var(--color-primary)' : 'var(--color-glass-border)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="w-11 h-14 rounded-2xl text-center text-2xl font-black outline-none transition-all"
                        style={{
                          background: digit ? 'rgba(168,85,247,0.12)' : 'var(--color-bg-3)',
                          border: `2px solid ${digit ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                          color: digit ? 'var(--color-primary)' : 'var(--color-text)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-dim)' }}>OTP có hiệu lực trong 5 phút</p>
                </div>
                <motion.button onClick={() => verifyPhoneOtp()} disabled={verifying || otp.length !== 6}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  {verifying ? '⏳ Đang xác nhận...' : '✅ Xác Nhận & Đăng Nhập'}
                </motion.button>
                <button onClick={() => sendPhoneOtp()} disabled={sendingOtp}
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                  {sendingOtp ? '⏳...' : '🔄 Gửi lại OTP'}
                </button>
              </motion.div>
            )}

            {/* ── User mới: nhập tên ── */}
            {isNewUser && (
              <motion.div key="new-user" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Tài khoản mới!</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Nhập tên để hoàn tất đăng ký</p>
                </div>
                <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)}
                  placeholder="Tên của bạn" autoFocus
                  onKeyDown={e => e.key === 'Enter' && updateName()}
                  className="w-full px-4 py-3 rounded-2xl text-sm" style={S}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
                <motion.button onClick={() => updateName()} disabled={updatingName}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  {updatingName ? '⏳...' : '✅ Hoàn tất đăng ký'}
                </motion.button>
                <button onClick={() => {
                  if (pendingAuth) { setAuth(pendingAuth.user, pendingAuth.access, pendingAuth.refresh); doRedirect(pendingAuth.user) }
                }} className="w-full py-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  Bỏ qua
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--color-text-muted)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold" style={{ color: 'var(--color-primary)' }}>Đăng ký ngay</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
