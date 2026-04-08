import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }} className="text-8xl mb-6">🎬</motion.div>
        <h1 className="font-display font-bold text-6xl mb-4 text-gradient-cyan">404</h1>
        <h2 className="font-bold text-2xl mb-4" style={{ color: 'var(--color-text)' }}>Trang Không Tìm Thấy</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Trang bạn tìm kiếm đã bị xóa hoặc không tồn tại.
        </p>
        <Link to="/" className="btn-primary px-8 py-3 inline-block">Về Trang Chủ</Link>
      </motion.div>
    </div>
  )
}
