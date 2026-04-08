import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Trash2, Edit3, Send } from 'lucide-react'
import api from '../../api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

interface ReviewSectionProps { movieId: string }

const STARS = [1,2,3,4,5,6,7,8,9,10]

export default function ReviewSection({ movieId }: ReviewSectionProps) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [rating, setRating] = useState(8)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', movieId],
    queryFn: () => api.get(`/movies/${movieId}/reviews`),
    select: d => d.data,
  })

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => api.post(`/movies/${movieId}/reviews`, { rating, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', movieId] })
      qc.invalidateQueries({ queryKey: ['movie', movieId] })
      toast.success('Đã gửi đánh giá! ⭐')
      setShowForm(false)
      setComment('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi gửi đánh giá'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: string) => api.delete(`/movies/${movieId}/reviews/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews', movieId] }); toast.success('Đã xóa') },
  })

  const reviews = data?.data || []
  const avgRating = data?.avgRating || 0

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>
            ⭐ Đánh Giá Phim
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {reviews.length} đánh giá · Điểm trung bình:{' '}
            <span className="font-bold" style={{ color: '#FDE68A' }}>{avgRating}/10</span>
          </p>
        </div>
        {user && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
            <Edit3 className="w-4 h-4" />
            {showForm ? 'Đóng' : 'Viết đánh giá'}
          </motion.button>
        )}
      </div>

      {/* Write Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden">
            <div className="p-5 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>Chọn điểm số:</p>
              {/* Star rating */}
              <div className="flex gap-1 mb-4">
                {STARS.map(s => (
                  <button key={s} onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-125">
                    <Star className="w-6 h-6 transition-colors"
                      style={{ color: s <= (hoverRating || rating) ? '#FDE68A' : 'rgba(255,255,255,0.15)',
                        fill: s <= (hoverRating || rating) ? '#FDE68A' : 'transparent' }} />
                  </button>
                ))}
                <span className="ml-2 text-lg font-bold" style={{ color: '#FDE68A' }}>{hoverRating || rating}/10</span>
              </div>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim này..."
                rows={3} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
              <div className="flex justify-end gap-3 mt-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm"
                  style={{ color: 'var(--color-text-muted)' }}>Hủy</button>
                <motion.button onClick={() => submit()} disabled={isPending}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                  <Send className="w-4 h-4" />
                  {isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
          <div className="text-4xl mb-2">⭐</div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any, i: number) => (
            <motion.div key={review._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                    {review.user?.avatar
                      ? <img src={review.user.avatar} alt="" className="w-full h-full object-cover" />
                      : review.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{review.user?.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3"
                          style={{ color: idx < review.rating ? '#FDE68A' : 'rgba(255,255,255,0.15)',
                            fill: idx < review.rating ? '#FDE68A' : 'transparent' }} />
                      ))}
                      <span className="text-xs ml-1 font-bold" style={{ color: '#FDE68A' }}>{review.rating}/10</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  {user?.id === review.user?._id && (
                    <button onClick={() => del(review._id)} className="p-1 rounded-lg transition-colors hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#F87171' }} />
                    </button>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{review.comment}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}