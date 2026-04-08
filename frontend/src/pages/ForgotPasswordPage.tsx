import { useState, useRef, KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'
import toast from 'react-hot-toast'

type Step = 'email' | 'otp' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const otp = otpDigits.join('')

  const inputBase = {
    background: 'var(--color-bg-3)',
    border: '1px solid var(--color-glass-border)',
    color: 'var(--color-text)',
    outline: 'none',
  }

  // ── OTP box handlers ──
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const d = [...otpDigits]
    d[idx] = val.slice(-1)
    setOtpDigits(d)
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const d = [...otpDigits]; d[idx - 1] = ''; setOtpDigits(d)
      otpRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const d = [...otpDigits]
    text.split('').forEach((ch, i) => { if (i < 6) d[i] = ch })
    setOtpDigits(d)
    otpRefs.current[Math.min(text.length, 5)]?.focus()
  }

  // ── Mutations ──
  const { mutate: sendOtp, isPending: sending } = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim()),
    onSuccess: (res: any) => {
      const code = res.data?.otp        // dev mode OTP
      const preview = res.data?.previewUrl
      if (code) {
        setDevOtp(code)
        setOtpDigits(code.split(''))    // auto-fill như SMS
      } else if (preview) {
        setDevOtp(`preview:${preview}`)
      } else {
        setDevOtp(null)
      }
      toast.success('OTP đã gửi! Kiểm tra email của bạn')
      setStep('otp')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi gửi OTP'),
  })

  const handleVerifyOtp = () => {
    if (otp.length !== 6) { toast.error('Nhập đủ 6 chữ số OTP'); return }
    setStep('password')
  }

  const { mutate: resetPwd, isPending: resetting } = useMutation({
    mutationFn: () => authApi.resetPassword(email.trim(), otp, newPwd),
    onSuccess: () => { setStep('done'); toast.success('🎉 Đặt lại mật khẩu thành công!') },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'OTP không đúng hoặc đã hết hạn')
      setStep('otp')
      setOtpDigits(['', '', '', '', '', ''])
    },
  })

  const handleReset = () => {
    if (newPwd.length < 6) { toast.error('Mật khẩu ≥ 6 ký tự'); return }
    if (newPwd !== confirmPwd) { toast.error('Mật khẩu không khớp'); return }
    resetPwd()
  }

  const pwStrength = newPwd.length >= 10 ? 4 : newPwd.length >= 8 ? 3 : newPwd.length >= 6 ? 2 : newPwd.length > 0 ? 1 : 0
  const pwStrengthColor = ['', '#F43F5E', '#F97316', '#FCD34D', '#34D399'][pwStrength]
  const pwStrengthLabel = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][pwStrength]

  const STEPS_LABELS = ['Email', 'OTP', 'Mật khẩu']
  const stepIdx = ['email', 'otp', 'password', 'done'].indexOf(step)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>

      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px]">

        <Link to="/login" className="inline-flex items-center gap-2 mb-6 text-sm transition-all"
          style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft className="w-4 h-4" /> Về đăng nhập
        </Link>

        <div className="rounded-3xl p-7"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', boxShadow: '0 4px 24px rgba(168,85,247,0.4)' }}>
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="text-center font-display font-bold text-2xl mb-1" style={{ color: 'var(--color-text)' }}>
            Quên Mật Khẩu
          </h1>
          <p className="text-center text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {step === 'email' && 'Nhập email — OTP sẽ hiện trong terminal (dev mode)'}
            {step === 'otp' && `Mã OTP gửi đến ${email}`}
            {step === 'password' && 'Tạo mật khẩu mới cho tài khoản'}
            {step === 'done' && 'Mật khẩu đã được đặt lại!'}
          </p>

          {/* Progress bar */}
          {step !== 'done' && (
            <div className="flex gap-2 mb-7">
              {STEPS_LABELS.map((label, i) => (
                <div key={label} className="flex-1 text-center">
                  <div className="h-1.5 rounded-full mb-1.5 transition-all duration-500"
                    style={{ background: i < stepIdx ? 'var(--color-primary)' : i === stepIdx ? 'var(--color-primary)' : 'var(--color-bg-3)' }} />
                  <span className="text-xs" style={{ color: i <= stepIdx ? 'var(--color-primary)' : 'var(--color-text-dim)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ─── Step: Email ─── */}
            {step === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Nhập email đã đăng ký"
                    onKeyDown={e => e.key === 'Enter' && email && sendOtp()}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm transition-all"
                    style={{ ...inputBase, borderRadius: 14 }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
                </div>


                <motion.button onClick={() => sendOtp()} disabled={sending || !email}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  {sending ? '⏳ Đang gửi...' : '📨 Gửi Mã OTP'}
                </motion.button>
              </motion.div>
            )}

            {/* ─── Step: OTP ─── */}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="space-y-5">

                {/* Dev OTP hint */}
                {devOtp && (
                  <div className="p-3 rounded-xl text-center"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px dashed rgba(52,211,153,0.3)' }}>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Dev mode — OTP đã điền tự động:</p>
                    <p className="font-mono font-black text-xl tracking-[0.4em]" style={{ color: '#34D399' }}>{devOtp}</p>
                  </div>
                )}

                {/* 6-box OTP input */}
                <div>
                  <p className="text-xs text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Nhập mã 6 chữ số được gửi đến email của bạn
                  </p>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <motion.input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el }}
                        type="text" inputMode="numeric" pattern="\d*"
                        maxLength={1}
                        value={digit}
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
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-11 h-14 rounded-2xl text-center text-2xl font-black outline-none transition-all"
                        style={{
                          background: digit ? 'rgba(168,85,247,0.12)' : 'var(--color-bg-3)',
                          border: `2px solid ${digit ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                          color: digit ? 'var(--color-primary)' : 'var(--color-text)',
                          caretColor: 'var(--color-primary)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-dim)' }}>
                    OTP có hiệu lực trong 10 phút
                  </p>
                </div>

                <motion.button onClick={handleVerifyOtp} disabled={otp.length !== 6}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  ✅ Xác Nhận OTP
                </motion.button>

                <button onClick={() => sendOtp()} disabled={sending}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-glass-border)' }}>
                  {sending ? '⏳ Đang gửi...' : '🔄 Gửi lại OTP'}
                </button>
              </motion.div>
            )}

            {/* ─── Step: Password ─── */}
            {step === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                    className="w-full pl-10 pr-12 py-3 rounded-2xl text-sm transition-all" style={{ ...inputBase, borderRadius: 14 }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'} />
                  <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-dim)' }}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength */}
                {newPwd && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                          style={{ background: pwStrength >= i ? pwStrengthColor : 'var(--color-bg-3)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: pwStrengthColor }}>{pwStrengthLabel}</p>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Xác nhận mật khẩu mới"
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm transition-all"
                    style={{ ...inputBase, borderRadius: 14, borderColor: confirmPwd && confirmPwd !== newPwd ? '#F43F5E' : 'var(--color-glass-border)' }}
                    onFocus={e => e.currentTarget.style.borderColor = confirmPwd !== newPwd && confirmPwd ? '#F43F5E' : 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = confirmPwd && confirmPwd !== newPwd ? '#F43F5E' : 'var(--color-glass-border)'} />
                </div>
                {confirmPwd && confirmPwd !== newPwd && (
                  <p className="text-xs" style={{ color: '#F43F5E' }}>❌ Mật khẩu không khớp</p>
                )}

                <motion.button onClick={handleReset} disabled={resetting || !newPwd || newPwd !== confirmPwd || newPwd.length < 6}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60 mt-2"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  {resetting ? '⏳ Đang đặt lại...' : '🔐 Đặt Lại Mật Khẩu'}
                </motion.button>
              </motion.div>
            )}

            {/* ─── Step: Done ─── */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-2 space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '2px solid #34D399' }}>
                  <CheckCircle className="w-8 h-8" style={{ color: '#34D399' }} />
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Thành công!</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Mật khẩu đã được cập nhật. Hãy đăng nhập lại.
                  </p>
                </div>
                <motion.button onClick={() => navigate('/login')}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  🚀 Đăng Nhập Ngay
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
