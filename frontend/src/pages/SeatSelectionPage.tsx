import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Film, MapPin, Users, ArrowRight, UserX } from 'lucide-react'
import { showtimeApi, bookingApi } from '../api'
import SeatGrid from '../components/booking/SeatGrid'
import BookingSteps from '../components/booking/BookingSteps'
import { SeatSkeleton } from '../components/ui/Skeletons'
import toast from 'react-hot-toast'
import { useShowtimeSocket } from '../hooks/useSocket'
import { useGroupBooking } from '../hooks/useGroupBooking'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

export default function SeatSelectionPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>()
  const navigate = useNavigate()
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [selectedSeatObjs, setSelectedSeatObjs] = useState<any[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const queryClient = useQueryClient()

  const {
    members, isInGroup, isHost, hostUserId,
    createRoom, leaveRoom, kickMember,
    getShareLink,
  } = useGroupBooking(showtimeId!)

  const { selectSeat, deselectSeat } = useShowtimeSocket(
    showtimeId,
    () => queryClient.invalidateQueries({ queryKey: ['seats', showtimeId] }),
    () => queryClient.invalidateQueries({ queryKey: ['seats', showtimeId] }),
    () => queryClient.invalidateQueries({ queryKey: ['seats', showtimeId] }),
  )

  const { data: stData } = useQuery({
    queryKey: ['showtime', showtimeId],
    queryFn: () => showtimeApi.getOne(showtimeId!),
    enabled: !!showtimeId,
  })

  const { data: seatsData, isLoading: loadingSeats } = useQuery({
    queryKey: ['seats', showtimeId],
    queryFn: () => showtimeApi.getSeats(showtimeId!),
    enabled: !!showtimeId,
    refetchInterval: 1000,
  })

  const createBookingMutation = useMutation({
    mutationFn: () => bookingApi.create(showtimeId!, selectedSeatIds),
    onSuccess: (res) => {
      toast.success('Ghế đã được giữ! Thanh toán trong 5 phút.')
      navigate(`/payment/${res.data.data._id}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể tạo đơn đặt vé')
    },
  })

  const handleSelectionChange = useCallback((ids: string[], seats: any[]) => {
    setSelectedSeatIds(prev => {
      prev.filter(id => !ids.includes(id)).forEach(id => deselectSeat(id))
      ids.filter(id => !prev.includes(id)).forEach(id => selectSeat(id))
      return ids
    })
    setSelectedSeatObjs(seats)
  }, [selectSeat, deselectSeat])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateRoom = () => {
    createRoom()
    setTimeout(() => setShowShareModal(true), 500)
  }

  const showtime = stData?.data?.data
  const seats: any[] = seatsData?.data?.data || []
  const totalAmount = selectedSeatObjs.reduce((s, seat) => s + seat.price, 0)
  const maxCols = seats.length > 0 ? Math.max(...seats.map((s: any) => s.col || s.number || 0)) : 20
  const containerMaxW = maxCols <= 8 ? 'max-w-2xl' : maxCols <= 12 ? 'max-w-3xl' : maxCols <= 16 ? 'max-w-5xl' : 'max-w-7xl'

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className={`${containerMaxW} mx-auto`}>
        <BookingSteps currentStep={2} />

        {showtime && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <Film className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Phim</p>
                <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--color-text)' }}>{showtime.movie?.title}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Suất Chiếu</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{fmtTime(showtime.startTime)}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(showtime.startTime)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Phòng</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{showtime.room?.name}</p>
                {seats.length > 0 && (
                  <p className="text-xs font-semibold mt-0.5"
                    style={{ color: seats.filter((s: any) => s.status === 'available').length <= 10 ? '#F97316' : '#34D399' }}>
                    {seats.filter((s: any) => s.status === 'available').length} ghế trống
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Định dạng</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {showtime.format} · {showtime.language === 'sub' ? 'Phụ đề' : 'Lồng tiếng'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">

              {/* Group Bar */}
              <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap"
                style={{ borderBottom: '1px solid rgba(168,85,247,0.1)' }}>
                <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
                  Chọn Ghế Ngồi
                </h2>

                {!isInGroup ? (
                  <button onClick={handleCreateRoom}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', color: '#fff', boxShadow: '0 4px 12px rgba(168,85,247,0.3)' }}>
                    👥 Đặt vé nhóm
                  </button>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Avatars */}
                    <div className="flex -space-x-2">
                      {members.map((m, i) => (
                        <div key={m.userId} title={`${m.name}${m.userId === hostUserId ? ' 👑' : ''}`}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ borderColor: m.userId === hostUserId ? '#F59E0B' : '#7C3AED', background: `hsl(${i * 60}, 70%, 45%)`, color: '#fff', zIndex: members.length - i }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {members.length} người · {isHost ? <span style={{ color: '#F59E0B' }}>👑 Bạn là host</span> : 'đang chọn'}
                    </span>
                    <button onClick={() => setShowShareModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>
                      🔗 Chia sẻ
                    </button>
                    <button onClick={leaveRoom}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                      Rời nhóm
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto px-2 pb-6 pt-4">
                {loadingSeats ? <SeatSkeleton /> : (
                  <SeatGrid
                    seats={seats}
                    showtimeId={showtimeId!}
                    selectedSeats={selectedSeatIds}
                    onSelectionChange={handleSelectionChange}
                    maxSeats={8}
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6 sticky top-24 space-y-5">
              <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Đơn Hàng</h3>

              {selectedSeatObjs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🪑</div>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Chưa chọn ghế nào</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>Nhấp vào ghế để chọn</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {selectedSeatObjs.map(seat => (
                      <div key={seat._id} className="flex justify-between items-center py-2"
                        style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                        <div>
                          <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-primary)' }}>{seat.label}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{seat.type.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {seat.price.toLocaleString('vi')}đ
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Tổng Cộng</span>
                    <span className="font-bold text-lg text-gradient-gold">{totalAmount.toLocaleString('vi')}đ</span>
                  </div>
                </>
              )}

              <button
                onClick={() => createBookingMutation.mutate()}
                disabled={selectedSeatIds.length === 0 || createBookingMutation.isPending}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBookingMutation.isPending
                  ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  : <>Tiếp Tục <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-dim)' }}>
                ⏱ Ghế được giữ trong 5 phút sau khi chọn
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Share Modal — host có thể kick từ đây */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowShareModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl p-6 w-full max-w-md"
              style={{ background: '#1a1a2e', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}>

              <h3 className="text-lg font-bold mb-1" style={{ color: '#fff' }}>👥 Đặt vé nhóm</h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Chia sẻ link này cho bạn bè để cùng chọn ghế realtime!
              </p>

              {/* Link share */}
              <div className="flex gap-2 mb-5">
                <input readOnly value={getShareLink()}
                  className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', color: '#fff' }} />
                <button onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', color: '#fff' }}>
                  {copied ? '✅ Đã copy' : '📋 Copy'}
                </button>
              </div>

              {/* Danh sách thành viên + host có thể kick */}
              {members.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {members.length} người trong phòng:
                  </p>
                  {members.map((m, i) => (
                    <div key={m.userId}
                      className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `hsl(${i * 60}, 70%, 45%)`, color: '#fff' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm" style={{ color: '#fff' }}>{m.name}</span>
                        {m.userId === hostUserId && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                            👑 Host
                          </span>
                        )}
                      </div>
                      {/* Host thấy nút kick người khác */}
                      {isHost && m.userId !== hostUserId && (
                        <button
                          onClick={() => kickMember(m.userId)}
                          title="Kick khỏi nhóm"
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
                          style={{ color: 'rgba(248,113,113,0.6)' }}>
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 rounded-xl text-sm transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}