import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Film, MapPin, Users, ArrowRight } from 'lucide-react'
import { showtimeApi, bookingApi } from '../api'
import SeatGrid from '../components/booking/SeatGrid'
import BookingSteps from '../components/booking/BookingSteps'
import { SeatSkeleton } from '../components/ui/Skeletons'
import toast from 'react-hot-toast'
import { useSocket } from '../hooks/useSocket'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

export default function SeatSelectionPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>()
  const navigate = useNavigate()
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [selectedSeatObjs, setSelectedSeatObjs] = useState<any[]>([])

  const queryClient = useQueryClient()
  const socket = useSocket()

  const { data: stData, isLoading: loadingSt } = useQuery({
    queryKey: ['showtime', showtimeId],
    queryFn: () => showtimeApi.getOne(showtimeId!),
    enabled: !!showtimeId,
  })

  const { data: seatsData, isLoading: loadingSeats } = useQuery({
    queryKey: ['seats', showtimeId],
    queryFn: () => showtimeApi.getSeats(showtimeId!),
    enabled: !!showtimeId,
    refetchInterval: 3000, // fallback polling 3s nếu socket không hoạt động
  })

  // Socket.IO — lắng nghe ghế thay đổi real-time
  useEffect(() => {
    if (!socket || !showtimeId) return

    // Join room theo showtimeId
    socket.emit('join-showtime', showtimeId)

    // Nhân viên/user khác giữ hoặc thả ghế → refetch ngay
    const handleSeatUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['seats', showtimeId] })
    }

    socket.on('seat-held', handleSeatUpdate)
    socket.on('seat-released', handleSeatUpdate)
    socket.on('seat-booked', handleSeatUpdate)
    socket.on('seats-updated', handleSeatUpdate) // fallback event chung

    return () => {
      socket.emit('leave-showtime', showtimeId)
      socket.off('seat-held', handleSeatUpdate)
      socket.off('seat-released', handleSeatUpdate)
      socket.off('seat-booked', handleSeatUpdate)
      socket.off('seats-updated', handleSeatUpdate)
    }
  }, [socket, showtimeId, queryClient])

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
    setSelectedSeatIds(ids)
    setSelectedSeatObjs(seats)
  }, [])

  const showtime = stData?.data?.data
  const seats: any[] = seatsData?.data?.data || []
  const totalAmount = selectedSeatObjs.reduce((s, seat) => s + seat.price, 0)

  // Tính số cột thực tế để co khung cho vừa
  const maxCols = seats.length > 0
    ? Math.max(...seats.map((s: any) => s.col || s.number || 0))
    : 20
  const containerMaxW = maxCols <= 8 ? 'max-w-2xl' : maxCols <= 12 ? 'max-w-3xl' : maxCols <= 16 ? 'max-w-5xl' : 'max-w-7xl'

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className={`${containerMaxW} mx-auto`}>
        <BookingSteps currentStep={2} />

        {/* Showtime Info */}
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
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{showtime.format} · {showtime.language === 'sub' ? 'Phụ đề' : 'Lồng tiếng'}</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Grid */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
              <h2 className="font-display font-semibold text-xl pt-6 pb-4 text-center" style={{ color: 'var(--color-text)' }}>
                Chọn Ghế Ngồi
              </h2>
              <div className="overflow-x-auto px-2 pb-6">
                {loadingSeats
                  ? <SeatSkeleton />
                  : <SeatGrid
                      seats={seats}
                      showtimeId={showtimeId!}
                      selectedSeats={selectedSeatIds}
                      onSelectionChange={handleSelectionChange}
                      maxSeats={8}
                    />
                }
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
                {createBookingMutation.isPending ? (
                  <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>Tiếp Tục <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-xs text-center" style={{ color: 'var(--color-text-dim)' }}>
                ⏱ Ghế được giữ trong 5 phút sau khi chọn
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}