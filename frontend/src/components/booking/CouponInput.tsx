import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

interface CouponInputProps {
  amount: number
  onDiscount: (discount: number, code: string) => void
  onRemove: () => void
  appliedCode?: string
}

export default function CouponInput({ amount, onDiscount, onRemove, appliedCode }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const validate = async () => {
    if (!code.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/coupons/validate', { code: code.trim(), amount })
      setResult(data.data)
      onDiscount(data.data.discount, code.trim().toUpperCase())
      toast.success(`🎉 Giảm ${data.data.discount.toLocaleString('vi')}đ!`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Mã không hợp lệ')
      setResult(null)
    }
    setLoading(false)
  }

  const remove = () => {
    setCode('')
    setResult(null)
    onRemove()
  }

  if (appliedCode && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--color-primary)' }}>{appliedCode}</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Giảm {result.discount.toLocaleString('vi')}đ
          </span>
        </div>
        <button onClick={remove} className="p-1 rounded-lg transition-colors hover:bg-red-500/10">
          <XCircle className="w-4 h-4" style={{ color: '#F87171' }} />
        </button>
      </motion.div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && validate()}
            placeholder="Nhập mã giảm giá..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono outline-none uppercase"
            style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
          />
        </div>
        <motion.button onClick={validate} disabled={loading || !code.trim()}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: 'var(--color-primary)' }}>
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
        </motion.button>
      </div>
    </div>
  )
}
