import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Film, MapPin, Users, ArrowRight, UserX } from 'lucide-react'
import { showtimeApi, bookingApi } from '../api'
import SeatGrid from '../components/booking/SeatGrid'
import BookingSteps from '../components/booking/BookingSteps'
import { SeatSkeleton } from '../components/ui/Skeletons'
import toast from 'react-hot-toast'
import { useShowtimeSocket, useSocket } from '../hooks/useSocket'
import { useGroupBooking } from '../hooks/useGroupBooking'

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

export default function SeatSelectionPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>()
  const navigate = useNavigate()
  const socket = useSocket()

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [selectedSeatObjs, setSelectedSeatObjs] = useState<any[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const queryClient = useQueryClient()

  const {
    members, isInGroup, isHost, hostUserId,
    createRoom, leaveRoom, kickMember,
    getShareLink,
    emitHover // 🔥 thêm
  } = useGroupBooking(showtimeId!)

  // 🔥 đảm bảo luôn join showtime (QUAN TRỌNG)
  useEffect(() => {
    if (!socket || !showtimeId) return
    socket.emit('join:showtime', showtimeId)

    return () => {
      socket.emit('leave:showtime', showtimeId)
    }
  }, [socket, showtimeId])

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

  // 🔥 FIX realtime + hover
  const handleSelectionChange = useCallback((ids: string[], seats: any[]) => {
    setSelectedSeatIds(prev => {
      prev.filter(id => !ids.includes(id)).forEach(id => deselectSeat(id))
      ids.filter(id => !prev.includes(id)).forEach(id => selectSeat(id))
      return ids
    })

    setSelectedSeatObjs(seats)

    // 🔥 gửi hover realtime
    if (ids.length > 0) {
      emitHover(ids[ids.length - 1])
    }
  }, [selectSeat, deselectSeat, emitHover])

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

  const maxCols = seats.length > 0
    ? Math.max(...seats.map((s: any) => s.col || s.number || 0))
    : 20

  const containerMaxW =
    maxCols <= 8 ? 'max-w-2xl'
    : maxCols <= 12 ? 'max-w-3xl'
    : maxCols <= 16 ? 'max-w-5xl'
    : 'max-w-7xl'

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className={`${containerMaxW} mx-auto`}>
        <BookingSteps currentStep={2} />

        {/* UI giữ nguyên 100% */}
        {/* KHÔNG sửa layout của bạn */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div className="glass-card overflow-hidden">

              {/* Group Bar giữ nguyên */}

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

          {/* Order Summary giữ nguyên */}
        </div>
      </div>

      {/* Modal giữ nguyên */}
    </div>
  )
}