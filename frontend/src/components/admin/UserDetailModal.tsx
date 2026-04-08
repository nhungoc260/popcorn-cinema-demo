// src/components/admin/UserDetailModal.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Lock, Unlock, Ticket, CreditCard, Star, Calendar, Trophy } from 'lucide-react'
import { adminApi } from '../../api'
import toast from 'react-hot-toast'

const TIER_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  bronze:   { label: '🥉 Đồng',    color: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.25)' },
  silver:   { label: '🥈 Bạc',     color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
  gold:     { label: '🥇 Vàng',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' },
  platinum: { label: '💎 Bạch Kim', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.25)' },
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  confirmed:   { label: 'Đã xác nhận', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)' },
  checked_in:  { label: 'Đã check-in', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  pending:     { label: 'Chờ xử lý',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)' },
  pending_payment: { label: 'Chờ thanh toán', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  cancelled:   { label: 'Đã huỷ',      color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)' },
}

interface Props {
  userId: string
  onClose: () => void
}

export default function UserDetailModal({ userId, onClose }: Props) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'bookings'>('info')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => adminApi.getUserDetail(userId),
    select: (d: any) => d.data.data,
  })

  const { mutate: toggleStatus, isPending: isToggling } = useMutation({
    mutationFn: () => adminApi.toggleUserStatus(userId),
    onSuccess: (res: any) => {
      toast.success(res.data.message)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Có lỗi xảy ra'),
  })

  const user = data?.user
  const loyalty = data?.loyalty
  const bookings: any[] = data?.bookings || []
  const totalSpent: number = data?.totalSpent || 0
  const tier = TIER_MAP[loyalty?.tier || 'bronze']

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--color-glass-border)' }}
          >
            <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
              Chi tiết người dùng
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {isLoading ? (
              // Skeleton loading
              <div className="space-y-4">
                <div className="h-24 rounded-xl skeleton" />
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl skeleton" />)}
                </div>
                <div className="h-40 rounded-xl skeleton" />
              </div>
            ) : !user ? (
              <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Không tìm thấy thông tin người dùng.
              </p>
            ) : (
              <>
                {/* ── Profile card ── */}
                <div
                  className="rounded-xl p-5 flex items-start gap-4"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                      color: 'white',
                    }}
                  >
                    {user.avatar
                      ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      : user.name?.charAt(0).toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                        {user.name}
                      </span>
                      {/* Hạng thẻ */}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
                      >
                        {tier.label}
                      </span>
                      {/* Trạng thái khoá */}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: user.isActive !== false ? 'rgba(52,211,153,0.1)' : 'rgba(244,63,94,0.1)',
                          color: user.isActive !== false ? '#34d399' : '#f43f5e',
                          border: `1px solid ${user.isActive !== false ? 'rgba(52,211,153,0.2)' : 'rgba(244,63,94,0.2)'}`,
                        }}
                      >
                        {user.isActive !== false ? 'Hoạt động' : 'Đã khoá'}
                      </span>
                    </div>

                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
                    {user.phone && (
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{user.phone}</p>
                    )}
                    {user.createdAt && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Calendar size={11} />
                        Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>

                  {/* Nút khoá/mở — ẩn với admin */}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => toggleStatus()}
                      disabled={isToggling}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                      style={{
                        background: user.isActive !== false ? 'rgba(244,63,94,0.1)' : 'rgba(52,211,153,0.1)',
                        color: user.isActive !== false ? '#f43f5e' : '#34d399',
                        border: `1px solid ${user.isActive !== false ? 'rgba(244,63,94,0.25)' : 'rgba(52,211,153,0.25)'}`,
                        opacity: isToggling ? 0.6 : 1,
                        cursor: isToggling ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {user.isActive !== false ? <Lock size={13} /> : <Unlock size={13} />}
                      {isToggling ? '...' : user.isActive !== false ? 'Khoá TK' : 'Mở khoá'}
                    </button>
                  )}
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      icon: <Ticket size={16} />,
                      value: bookings.filter(b => ['confirmed','checked_in'].includes(b.status)).length,
                      label: 'Vé đã đặt',
                      color: 'var(--color-primary)',
                    },
                    {
                      icon: <CreditCard size={16} />,
                      value: totalSpent >= 1_000_000
                        ? (totalSpent / 1_000_000).toFixed(1) + 'M đ'
                        : totalSpent.toLocaleString('vi-VN') + 'đ',
                      label: 'Tổng chi tiêu',
                      color: '#34d399',
                    },
                    {
                      icon: <Trophy size={16} />,
                      value: loyalty?.points?.toLocaleString('vi-VN') || 0,
                      label: 'Điểm tích lũy',
                      color: '#fbbf24',
                    },
                  ].map(({ icon, value, label, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-4 text-center"
                      style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}
                    >
                      <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* ── Loyalty detail ── */}
                {loyalty && (
                  <div
                    className="rounded-xl p-4 flex items-center justify-between"
                    style={{ background: 'var(--color-bg-3)', border: `1px solid ${tier.border}` }}
                  >
                    <div className="flex items-center gap-3">
                      <Star size={18} style={{ color: tier.color }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                          Hạng thành viên: <span style={{ color: tier.color }}>{tier.label}</span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          Tổng tích: {loyalty.totalEarned?.toLocaleString('vi-VN')} điểm ·
                          Đã dùng: {loyalty.totalSpent?.toLocaleString('vi-VN')} điểm
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-lg font-bold"
                      style={{ color: tier.color }}
                    >
                      {loyalty.points?.toLocaleString('vi-VN')} pts
                    </span>
                  </div>
                )}

                {/* ── Tabs ── */}
                <div>
                  <div
                    className="flex gap-1 p-1 rounded-xl mb-4"
                    style={{ background: 'var(--color-bg-3)' }}
                  >
                    {(['info', 'bookings'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                        style={{
                          background: activeTab === tab ? 'rgba(168,85,247,0.15)' : 'transparent',
                          color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          border: activeTab === tab ? '1px solid rgba(168,85,247,0.25)' : '1px solid transparent',
                        }}
                      >
                        {tab === 'info' ? '👤 Thông tin' : `🎟️ Lịch sử vé (${bookings.length})`}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Thông tin */}
                  {activeTab === 'info' && (
                    <div className="space-y-2">
                      {[
                        { label: 'Vai trò', value: user.role === 'admin' ? '⚙️ Admin' : user.role === 'staff' ? '🧑‍💼 Nhân viên' : '👤 Khách hàng' },
                        { label: 'Email', value: user.email },
                        { label: 'Số điện thoại', value: user.phone || '—' },
                        { label: 'Giới tính', value: user.gender || '—' },
                        { label: 'Ngày sinh', value: user.birthday ? new Date(user.birthday).toLocaleDateString('vi-VN') : '—' },
                        { label: 'Xác minh email', value: user.isVerified ? '✅ Đã xác minh' : '❌ Chưa xác minh' },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between px-4 py-3 rounded-xl"
                          style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}
                        >
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab: Lịch sử vé */}
                  {activeTab === 'bookings' && (
                    <>
                      {bookings.length === 0 ? (
                        <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          Chưa có vé nào.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {bookings.map((b: any) => {
                            const s = STATUS_MAP[b.status] || STATUS_MAP.pending
                            return (
                              <div
                                key={b._id}
                                className="flex items-center gap-3 rounded-xl px-4 py-3"
                                style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)' }}
                              >
                                {/* Poster */}
                                {b.showtime?.movie?.poster ? (
                                  <img
                                    src={b.showtime.movie.poster}
                                    alt=""
                                    className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                                  />
                                ) : (
                                  <div
                                    className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center"
                                    style={{ background: 'var(--color-bg)' }}
                                  >
                                    <Ticket size={14} style={{ color: 'var(--color-text-muted)' }} />
                                  </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                    {b.showtime?.movie?.title || 'Phim'}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                    {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                                    {b.seatLabels?.length > 0 && ` · Ghế: ${b.seatLabels.join(', ')}`}
                                    {b.showtime?.room?.name && ` · ${b.showtime.room.name}`}
                                  </p>
                                  <span
                                    className="inline-block text-xs px-1.5 py-0.5 rounded mt-1"
                                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                                  >
                                    {s.label}
                                  </span>
                                </div>

                                {/* Price */}
                                <span
                                  className="text-sm font-semibold flex-shrink-0"
                                  style={{ color: 'var(--color-primary)' }}
                                >
                                  {(b.paidAmount ?? b.totalAmount)?.toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}