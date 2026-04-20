import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, BarChart3, Star } from 'lucide-react'
import { adminApi, analyticsApi } from '../../api'
import toast from 'react-hot-toast'
import UserDetailModal from '../../components/admin/UserDetailModal'

const ROLES = [
  { value: 'customer', label: '👤 Khách hàng', color: '#60A5FA' },
  { value: 'staff',    label: '🧑‍💼 Nhân viên',  color: '#34D399' },
  { value: 'admin',    label: '⚙️ Admin',       color: '#F43F5E' },
]

export default function AdminUsers() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [behaviorUserId, setBehaviorUserId] = useState<string | null>(null)
  const [showReviews, setShowReviews] = useState(false)  // ✅ thêm

  const { data: behaviorData } = useQuery({
    queryKey: ['user-behavior', behaviorUserId],
    queryFn: () => analyticsApi.getUserBehavior(behaviorUserId!),
    select: (d: any) => d.data.data,
    enabled: !!behaviorUserId,
  })
  const behavior = behaviorData as any

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 20, role: roleFilter || undefined }),
    select: d => d.data,
  })
  const result = data as any

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Đã cập nhật vai trò')
    },
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{
          background: 'var(--color-bg-2)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(168,85,247,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </Link>
          <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>
            👥 Người Dùng
          </h1>
        </div>
        <div className="flex gap-2">
          {['', 'customer', 'staff', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: roleFilter === r ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
                border: `1px solid ${roleFilter === r ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                color: roleFilter === r ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {r || 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl skeleton" />)}
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Người dùng', 'Email', 'Vai trò', 'Hành động'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(result?.data || []).map((u: any, i: number) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                  >
                    {/* Tên */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            color: 'white',
                          }}
                        >
                          {u.avatar
                            ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                            : u.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                            {u.name}
                          </span>
                          {u.isActive === false && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}
                            >
                              Đã khoá
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {u.email}
                    </td>

                    {/* Vai trò */}
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: 'rgba(168,85,247,0.1)',
                          color: ROLES.find(r => r.value === u.role)?.color || 'var(--color-primary)',
                          border: '1px solid rgba(168,85,247,0.2)',
                        }}
                      >
                        {ROLES.find(r => r.value === u.role)?.label || u.role}
                      </span>
                    </td>

                    {/* Hành động */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUserId(u._id)}
                          className="p-1.5 rounded-lg transition-all"
                          title="Xem chi tiết"
                          style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = 'var(--color-primary)'
                            e.currentTarget.style.background = 'rgba(168,85,247,0.1)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = 'var(--color-text-muted)'
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => { setBehaviorUserId(u._id); setShowReviews(false) }}
                          className="p-1.5 rounded-lg transition-all"
                          title="Phân tích hành vi"
                          style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = '#F472B6'
                            e.currentTarget.style.background = 'rgba(244,114,182,0.1)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = 'var(--color-text-muted)'
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>

                        <select
                          value={u.role}
                          onChange={e => changeRole({ id: u._id, role: e.target.value })}
                          className="text-xs px-2 py-1 rounded-lg outline-none"
                          style={{
                            background: 'var(--color-bg-3)',
                            border: '1px solid var(--color-glass-border)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <option value="customer">customer</option>
                          <option value="staff">staff</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal phân tích hành vi */}
      {behaviorUserId && behavior && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => { setBehaviorUserId(null); setShowReviews(false) }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl p-6 space-y-4 overflow-y-auto max-h-[80vh]"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* ✅ Nút back khi đang xem reviews */}
                {showReviews && (
                  <button
                    onClick={() => setShowReviews(false)}
                    className="p-1 rounded-lg"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {showReviews ? '⭐ Đánh giá' : '📊 Phân tích hành vi'}
                </h2>
              </div>
              <button
                onClick={() => { setBehaviorUserId(null); setShowReviews(false) }}
                style={{ color: 'var(--color-text-muted)', fontSize: 18 }}
              >✕</button>
            </div>

            {/* ✅ Khi showReviews = false: hiển thị phân tích hành vi như cũ */}
            {!showReviews && (
              <>
                {/* Persona */}
                <div
                  className="p-4 rounded-2xl"
                  style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
                >
                  <div className="font-semibold" style={{ color: 'var(--color-primary)' }}>{behavior.persona}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {behavior.totalMovies} phim · {(behavior.totalSpent || 0).toLocaleString('vi')}đ · Đánh giá TB {behavior.avgRating}/10
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Phim đã xem', value: behavior.totalMovies, clickable: false },
                    { label: 'Đánh giá', value: behavior.totalReviews, clickable: true },
                    { label: 'Đi cùng TB', value: behavior.avgSeatsPerBooking + ' người', clickable: false },
                  ].map(({ label, value, clickable }) => (
                    <div
                      key={label}
                      onClick={() => clickable && setShowReviews(true)}
                      className="p-3 rounded-xl text-center transition-all"
                      style={{
                        background: 'var(--color-bg-3)',
                        border: `1px solid ${clickable ? 'rgba(168,85,247,0.35)' : 'var(--color-glass-border)'}`,
                        cursor: clickable ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => {
                        if (clickable) e.currentTarget.style.background = 'rgba(168,85,247,0.12)'
                      }}
                      onMouseLeave={e => {
                        if (clickable) e.currentTarget.style.background = 'var(--color-bg-3)'
                      }}
                    >
                      <div className="font-black text-lg" style={{ color: 'var(--color-primary)' }}>{value}</div>
                      <div className="text-xs mt-0.5" style={{ color: clickable ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {label}{clickable ? ' →' : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Genre bars */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Thể loại yêu thích</div>
                  {(behavior.favoriteGenres || []).map((g: any) => (
                    <div key={g.genre}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--color-text)' }}>{g.genre}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{g.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${g.pct}%`, background: 'linear-gradient(90deg, var(--color-primary), #FDE68A)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Favorite theater */}
                {behavior.favoriteTheater && (
                  <div
                    className="text-sm flex items-center gap-2 pt-2"
                    style={{ borderTop: '1px solid var(--color-glass-border)' }}
                  >
                    <span>🏛</span>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Rạp yêu thích: </span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{behavior.favoriteTheater.name}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}> ({behavior.favoriteTheater.count} lần)</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ✅ Khi showReviews = true: hiển thị danh sách reviews */}
            {showReviews && (
              <div className="space-y-3">
                {(behavior.reviews || []).length === 0 && (
                  <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Chưa có đánh giá nào
                  </div>
                )}
                {(behavior.reviews || []).map((r: any) => {
                  const isToxic = r.rating <= 4
                  return (
                    <div
                      key={r._id}
                      className="p-3 rounded-xl space-y-1.5"
                      style={{
                        background: isToxic ? 'rgba(244,63,94,0.06)' : 'var(--color-bg-3)',
                        border: `1px solid ${isToxic ? 'rgba(244,63,94,0.3)' : 'var(--color-glass-border)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                          🎬 {r.movie?.title || 'Phim không xác định'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" fill="#FDE68A" style={{ color: '#FDE68A' }} />
                          <span
                            className="text-xs font-bold"
                            style={{ color: isToxic ? '#F43F5E' : '#FDE68A' }}
                          >
                            {r.rating}/10
                          </span>
                          <span className="text-xs">{isToxic ? '⚠️' : '✅'}</span>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                          "{r.comment}"
                        </p>
                      )}
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Modal chi tiết user */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}