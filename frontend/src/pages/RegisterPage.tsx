import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.register({ name: form.name, email: form.email, password: form.password, phone: form.phone }),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.access, data.data.refresh)
      toast.success('Đăng ký thành công! 🎉')
      navigate('/')
    },
    onError: (err: any) => {
      console.error('Register error:', err.response?.data || err.message)
      const msg = err.response?.data?.message || err.message || 'Đăng ký thất bại'
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Vui lòng nhập họ tên'); return }
    if (!form.email.trim()) { toast.error('Vui lòng nhập email'); return }
    if (form.password.length < 6) { toast.error('Mật khẩu ít nhất 6 ký tự'); return }
    if (form.password !== form.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return }
    mutate()
  }

  const fields = [
    { key: 'name', label: 'Họ tên', icon: User, type: 'text', placeholder: 'Nguyễn Văn A' },
    { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Số điện thoại', icon: Phone, type: 'tel', placeholder: '0901234567' },
    { key: 'password', label: 'Mật khẩu', icon: Lock, type: showPwd ? 'text' : 'password', placeholder: '••••••••', hasToggle: true },
    { key: 'confirm', label: 'Xác nhận mật khẩu', icon: Lock, type: showPwd ? 'text' : 'password', placeholder: '••••••••' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>
      <div className="absolute top-1/3 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: 'var(--color-primary)' }} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>
        <div className="rounded-3xl p-8"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🎬</div>
            <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--color-text)' }}>Tạo Tài Khoản</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Tham gia Popcorn Cinema ngay hôm nay</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, icon: Icon, type, placeholder, hasToggle }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input
                    type={type} value={(form as any)[key]} onChange={set(key)} required={key !== 'phone'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
                    placeholder={placeholder}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
                  />
                  {hasToggle && (
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-dim)' }}>
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <motion.button type="submit" disabled={isPending}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-sm mt-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.35)' }}>
              {isPending ? '⏳ Đang tạo...' : '🎉 Đăng Ký Ngay'}
            </motion.button>
          </form>
          <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary)' }}>Đăng nhập</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
