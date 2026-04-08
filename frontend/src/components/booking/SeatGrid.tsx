import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useShowtimeSocket } from '../../hooks/useSocket'
import { useAuthStore } from '../../store/authStore'

interface Seat {
  _id: string
  label: string
  row: string
  col: number
  number?: number
  type: 'standard' | 'vip' | 'couple' | 'recliner' | 'disabled' | 'aisle'
  price: number
  status: 'available' | 'locked' | 'booked'
  lockedBy?: string | null
}

interface SeatGridProps {
  seats: Seat[]
  showtimeId: string
  selectedSeats: string[]
  onSelectionChange: (selected: string[], seats: Seat[]) => void
  maxSeats?: number
}

// Màu ghế theo loại — khớp với AdminSeatDesigner
const SEAT_STYLE = {
  standard: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.5)', text: '#C084FC' },
  vip:      { bg: 'rgba(252,211,77,0.12)',  border: 'rgba(252,211,77,0.5)',  text: '#FCD34D' },
  couple:   { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.5)',  text: '#34D399' },
  recliner: { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.5)',  text: '#F97316' },
  disabled: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', text: '#475569' },
  aisle:    { bg: 'transparent',            border: 'transparent',           text: 'transparent' },
}

const LEGEND = [
  { label: 'Thường',    bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.5)', text: '#C084FC' },
  { label: 'VIP',       bg: 'rgba(252,211,77,0.12)',  border: 'rgba(252,211,77,0.5)',  text: '#FCD34D' },
  { label: 'Couple',    bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.5)',  text: '#34D399' },
  { label: 'Recliner',  bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.5)',  text: '#F97316' },
  { label: 'Đang chọn', bg: '#A855F7',               border: '#A855F7',               text: 'white' },
  { label: 'Đang giữ',  bg: 'rgba(239,68,68,0.25)',  border: 'rgba(239,68,68,0.7)',   text: '#EF4444' },
  { label: 'Đã đặt',    bg: 'rgba(71,85,105,0.25)',  border: 'rgba(71,85,105,0.4)',   text: '#475569' },
]

export default function SeatGrid({ seats, showtimeId, selectedSeats, onSelectionChange, maxSeats = 8 }: SeatGridProps) {
  const { user } = useAuthStore()
  const [localSeats, setLocalSeats] = useState<Seat[]>(seats)

  useEffect(() => { setLocalSeats(seats) }, [seats])

  // WebSocket realtime
  const handleSeatLocked = useCallback(({ seatId, userId }: any) => {
    if (userId === user?.id) return
    setLocalSeats(prev => prev.map(s => s._id === seatId ? { ...s, status: 'locked' as const, lockedBy: userId } : s))
  }, [user?.id])

  const handleSeatReleased = useCallback(({ seatId }: any) => {
    setLocalSeats(prev => prev.map(s => s._id === seatId ? { ...s, status: 'available' as const, lockedBy: null } : s))
  }, [])

  const handleSeatBooked = useCallback(({ seatIds }: any) => {
    setLocalSeats(prev => prev.map(s => seatIds.includes(s._id) ? { ...s, status: 'booked' as const } : s))
  }, [])

  const { selectSeat, deselectSeat } = useShowtimeSocket(showtimeId, handleSeatLocked, handleSeatReleased, handleSeatBooked)

  const handleClick = useCallback((seat: Seat) => {
    if (seat.type === 'aisle' || seat.type === 'disabled') return
    if (seat.status === 'booked') return
    if (seat.status === 'locked' && seat.lockedBy !== user?.id) return

    const isSelected = selectedSeats.includes(seat._id)
    let next: string[]
    if (isSelected) {
      next = selectedSeats.filter(id => id !== seat._id)
      deselectSeat(seat._id)
    } else {
      if (selectedSeats.length >= maxSeats) {
        return
      }
      next = [...selectedSeats, seat._id]
      selectSeat(seat._id)
    }
    onSelectionChange(next, localSeats.filter(s => next.includes(s._id)))
  }, [selectedSeats, localSeats, user?.id, maxSeats, selectSeat, deselectSeat, onSelectionChange])

  // Tính inline style cho từng ghế
  const getSeatStyle = (seat: Seat): React.CSSProperties => {
    const isSelected = selectedSeats.includes(seat._id)
    const isMyLocked = seat.status === 'locked' && seat.lockedBy === user?.id

    if (seat.type === 'aisle') return { visibility: 'hidden' }

    if (isSelected || isMyLocked) return {
      background: '#A855F7',
      border: '2px solid #C084FC',
      color: 'white',
      cursor: 'pointer',
      transform: 'scale(0.9)',
    }
    if (seat.status === 'booked') return {
      background: 'rgba(71,85,105,0.25)',
      border: '2px solid rgba(71,85,105,0.4)',
      color: '#475569',
      cursor: 'not-allowed',
    }
    if (seat.status === 'locked') return {
      background: 'rgba(239,68,68,0.25)',
      border: '2px solid rgba(239,68,68,0.7)',
      color: '#EF4444',
      cursor: 'not-allowed',
      animation: 'pulse 1.5s ease-in-out infinite',
      boxShadow: '0 0 10px rgba(239,68,68,0.5)',
    }
    const s = SEAT_STYLE[seat.type] || SEAT_STYLE.standard
    return {
      background: s.bg,
      border: `2px solid ${s.border}`,
      color: s.text,
      cursor: 'pointer',
    }
  }

  // Group by row
  const rowMap: Record<string, Seat[]> = {}
  localSeats.forEach(s => {
    if (!rowMap[s.row]) rowMap[s.row] = []
    rowMap[s.row].push(s)
  })

  if (localSeats.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🪑</div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Đang tải sơ đồ ghế...</p>
      </div>
    )
  }

  return (
    <div className="w-full select-none">
      {/* Screen */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-3/4 h-1.5 rounded-full mb-2"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.7),transparent)', boxShadow: '0 0 16px rgba(168,85,247,0.5)' }} />
        <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--color-text-dim)' }}>Màn Hình</span>
      </div>

      {/* Seat rows */}
      <div className="overflow-x-auto pb-4">
        <div className="flex flex-col items-center w-max mx-auto">
          {Object.entries(rowMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([rowLabel, rowSeats]) => (
              <div key={rowLabel} className="flex items-center gap-1.5 mb-1.5">
                {/* Row label left */}
                <span className="w-6 text-xs font-bold text-center flex-shrink-0"
                  style={{ color: 'var(--color-text-dim)' }}>{rowLabel}</span>

                {/* Seats */}
                {rowSeats
                  .sort((a, b) => (a.col || a.number || 0) - (b.col || b.number || 0))
                  .map((seat, idx, arr) => {
                    const colNum = seat.col || seat.number || idx + 1
                    const isMiddle = idx === Math.floor(rowSeats.length / 2) - 1

                    // Ghế đôi: skip ô thứ 2 trong cặp (index lẻ mà ô trước cũng là couple)
                    if (seat.type === 'couple' && idx % 2 === 1 && arr[idx - 1]?.type === 'couple') {
                      return null
                    }

                    const isCouple = seat.type === 'couple'
                    // Ghế đôi chọn cả 2: lấy _id của ô kế tiếp
                    const partnerSeat = isCouple ? arr[idx + 1] : null

                    const isSelected = selectedSeats.includes(seat._id) ||
                      (isCouple && partnerSeat && selectedSeats.includes(partnerSeat._id))

                    return (
                      <div key={seat._id} className={isMiddle ? 'mr-3' : ''}>
                        <motion.button
                          whileHover={seat.status === 'available' && !isSelected && seat.type !== 'aisle' ? { scale: 1.05, y: -2 } : {}}
                          whileTap={seat.status === 'available' && seat.type !== 'aisle' ? { scale: 0.95 } : {}}
                          onClick={() => {
                            if (isCouple && partnerSeat) {
                              // Click ghế đôi: toggle cả cặp
                              handleClick(seat)
                              if (!isSelected) handleClick(partnerSeat)
                              else if (selectedSeats.includes(partnerSeat._id)) handleClick(partnerSeat)
                            } else {
                              handleClick(seat)
                            }
                          }}
                          title={
                            seat.type === 'aisle' ? '' :
                            seat.status === 'booked' ? 'Đã đặt' :
                            seat.status === 'locked' && seat.lockedBy !== user?.id ? 'Đang được giữ' :
                            isCouple && partnerSeat
                              ? `${seat.label}-${partnerSeat.label} · Couple · ${(seat.price + partnerSeat.price).toLocaleString('vi')}đ`
                              : `${seat.label} · ${seat.type === 'vip' ? 'VIP' : seat.type === 'recliner' ? 'Recliner' : seat.type === 'couple' ? 'Couple' : 'Thường'} · ${seat.price.toLocaleString('vi')}đ`
                          }
                          className="rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-150 relative"
                          style={{
                            ...(isCouple ? { width: 72, height: 32 } : { width: 32, height: 32 }),
                            ...getSeatStyle({ ...seat, ...(isSelected ? {} : {}) }),
                            ...(isSelected ? {
                              background: '#A855F7',
                              border: '2px solid #C084FC',
                              color: 'white',
                            } : {}),
                          }}
                        >
                          {/* Đường kẻ giữa ghế đôi */}
                          {isCouple && (
                            <div className="absolute inset-y-1.5 left-1/2 w-px opacity-40"
                              style={{ background: 'currentColor' }} />
                          )}
                          {seat.type !== 'aisle' ? (
                            isSelected ? '✓' : isCouple && partnerSeat ? `${colNum}-${partnerSeat.col || partnerSeat.number}` : colNum
                          ) : null}
                        </motion.button>
                      </div>
                    )
                  })}

                {/* Row label right */}
                <span className="w-6 text-xs font-bold text-center flex-shrink-0"
                  style={{ color: 'var(--color-text-dim)' }}>{rowLabel}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {LEGEND.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg text-xs flex items-center justify-center font-bold"
              style={{ background: item.bg, border: `2px solid ${item.border}`, color: item.text }}>
              {item.label === 'Đang chọn' ? '✓' : ''}
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}