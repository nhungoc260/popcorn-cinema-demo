import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, Grid, Eye } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

type SeatType = 'standard' | 'vip' | 'couple' | 'recliner' | 'aisle' | 'empty'

interface Seat {
  row: string
  number: number
  type: SeatType
  isAisle: boolean
  _id?: string
}

const SEAT_COLORS: Record<SeatType, { bg: string; border: string; label: string; price?: string }> = {
  standard: { bg: '#1E3A5F', border: 'var(--color-primary)', label: 'Thường',    price: '85K' },
  vip:      { bg: '#2D1B4E', border: '#A78BFA',              label: 'VIP',        price: '130K' },
  couple:   { bg: '#1A3020', border: '#34D399',              label: 'Đôi',        price: '200K' },
  recliner: { bg: '#3B1A1A', border: '#F97316',              label: 'Recliner',   price: '180K' },
  aisle:    { bg: 'transparent', border: 'transparent',      label: 'Lối đi' },
  empty:    { bg: 'transparent', border: 'transparent',      label: 'Trống' },
}

const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const ROOM_TYPES = [
  { value: 'standard', label: 'Standard',   prices: { standard: 85000,  vip: 110000, couple: 180000, recliner: 150000 } },
  { value: 'vip',      label: 'VIP',         prices: { standard: 100000, vip: 130000, couple: 200000, recliner: 170000 } },
  { value: 'imax',     label: 'IMAX',        prices: { standard: 160000, vip: 200000, couple: 300000, recliner: 250000 } },
  { value: '4dx',      label: '4DX',         prices: { standard: 200000, vip: 240000, couple: 350000, recliner: 280000 } },
  { value: 'couple',   label: 'Couple Room', prices: { standard: 100000, vip: 130000, couple: 200000, recliner: 170000 } },
]

const fmt = (n: number) => (n / 1000) + 'K'

function generateGrid(rows: number, cols: number, existingSeats: Seat[]): Seat[][] {
  const existMap: Record<string, Seat> = {}
  existingSeats.forEach(s => { existMap[`${s.row}-${s.number}`] = s })

  return ROWS.slice(0, rows).map(row =>
    Array.from({ length: cols }, (_, ci) => {
      const num = ci + 1
      const key = `${row}-${num}`
      return existMap[key] || { row, number: num, type: 'standard' as SeatType, isAisle: false }
    })
  )
}

export default function AdminSeatDesigner() {
  const { roomId } = useParams<{ roomId?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState(12)
  const [brushType, setBrushType] = useState<SeatType>('standard')
  const [isPainting, setIsPainting] = useState(false)
  const [grid, setGrid] = useState<Seat[][]>(() => generateGrid(10, 12, []))
  const [theaterId, setTheaterId] = useState('')
  const [roomName, setRoomName] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [roomType, setRoomType] = useState('standard')
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(ROOM_TYPES[0].prices)

  const { data: roomData } = useQuery({
    queryKey: ['room-edit', roomId],
    queryFn: () => api.get(`/admin/rooms/${roomId}`),
    enabled: !!roomId,
    select: d => d.data.data,
  })

  // Load existing room data into designer
  useEffect(() => {
    if (!roomData) return
    const room = roomData as any
    const r = room.rows || 10
    const c = room.cols || 12
    setRows(r)
    setCols(c)
    setRoomName(room.name || '')
    setTheaterId(room.theater?._id || room.theater || '')
    if (room.prices) {
      setCustomPrices(room.prices)
    } else {
      const rt = ROOM_TYPES.find(r => r.value === (room.type || 'standard')) || ROOM_TYPES[0]
      setCustomPrices(rt.prices)
    }
    if (room.seats?.length) {
      setGrid(generateGrid(r, c, room.seats))
    } else {
      setGrid(generateGrid(r, c, []))
    }
  }, [roomData])

  const { data: theatersData } = useQuery({
    queryKey: ['theaters-admin'],
    queryFn: () => api.get('/admin/theaters'),
    select: d => d.data.data,
  })

  const { mutate: saveRoom, isPending: saving } = useMutation({
    mutationFn: () => {
      const seats = grid.flat().filter(s => s.type !== 'empty').map(s => ({
        row: s.row, number: s.number, type: s.type, isAisle: s.type === 'aisle'
      }))
      const payload = { theater: theaterId, name: roomName, type: roomType, seats, prices: customPrices }
      return roomId ? api.put(`/admin/rooms/${roomId}`, payload) : api.post('/admin/rooms', payload)
    },
    onSuccess: () => {
      toast.success(`✅ ${roomId ? 'Cập nhật' : 'Tạo'} phòng thành công!`)
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room-edit'] })
      navigate('/admin/rooms')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Lỗi lưu'),
  })

  const rebuildGrid = useCallback((newRows: number, newCols: number) => {
    setGrid(prev => {
      const flat = prev.flat()
      return generateGrid(newRows, newCols, flat)
    })
  }, [])

  const paintSeat = useCallback((row: string, num: number) => {
    setGrid(prev => prev.map(rowSeats => {
      const idx = rowSeats.findIndex(s => s.row === row && s.number === num)
      if (idx === -1) return rowSeats

      const newRow = [...rowSeats]
      const nextType = brushType === 'empty' ? 'standard' : brushType

      if (brushType === 'couple') {
        const pairStart = idx % 2 === 0 ? idx : idx - 1
        const pairEnd = pairStart + 1
        if (pairStart >= 0 && pairEnd < newRow.length) {
          newRow[pairStart] = { ...newRow[pairStart], type: 'couple', isAisle: false }
          newRow[pairEnd]   = { ...newRow[pairEnd],   type: 'couple', isAisle: false }
        }
      } else {
        const pairStart = idx % 2 === 0 ? idx : idx - 1
        const pairEnd = pairStart + 1
        const isCurrentCouple = newRow[idx]?.type === 'couple'

        if (isCurrentCouple) {
          if (pairStart >= 0) newRow[pairStart] = { ...newRow[pairStart], type: nextType, isAisle: nextType === 'aisle' }
          if (pairEnd < newRow.length) newRow[pairEnd] = { ...newRow[pairEnd], type: nextType, isAisle: nextType === 'aisle' }
        } else {
          newRow[idx] = { ...newRow[idx], type: nextType, isAisle: nextType === 'aisle' }
        }
      }

      return newRow
    }))
  }, [brushType])

  const theaters = (theatersData as any[]) || []

  const handleRoomTypeChange = (val: string) => {
    setRoomType(val)
    const rt = ROOM_TYPES.find(r => r.value === val) || ROOM_TYPES[0]
    setCustomPrices(rt.prices)
  }

  const seatColors = {
    ...SEAT_COLORS,
    standard: { ...SEAT_COLORS.standard, price: fmt(customPrices.standard) },
    vip:      { ...SEAT_COLORS.vip,      price: fmt(customPrices.vip) },
    couple:   { ...SEAT_COLORS.couple,   price: fmt(customPrices.couple) },
    recliner: { ...SEAT_COLORS.recliner, price: fmt(customPrices.recliner) },
  }

  const stats = grid.flat().reduce((acc, s) => {
    if (s.type !== 'aisle') acc[s.type] = (acc[s.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b px-6 py-4 flex items-center gap-3"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.15)' }}>
        <Link to="/admin/rooms" className="p-2 rounded-xl hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
        </Link>
        <Grid className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
        <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>
          {roomId ? 'Chỉnh Sửa Sơ Đồ Ghế' : 'Thiết Kế Phòng Chiếu'}
        </h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: showPreview ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
              border: `1px solid ${showPreview ? 'rgba(168,85,247,0.5)' : 'var(--color-glass-border)'}`,
              color: showPreview ? 'var(--color-primary)' : 'var(--color-text-muted)'
            }}>
            <Eye className="w-4 h-4" /> Preview
          </button>
          {/* Seat count badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: 'var(--color-primary)' }}>
            <span className="font-black">{Object.values(stats).filter((_, i) => Object.keys(stats)[i] !== 'aisle').reduce((a: any, b: any) => a + b, 0)}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ghế</span>
          </div>
          <motion.button onClick={() => saveRoom()} disabled={saving || !roomName || !theaterId}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Đang lưu...' : 'Lưu Phòng'}
          </motion.button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">

        {/* ── LEFT PANEL: Controls ── */}
        <div className="w-72 flex-shrink-0 border-r overflow-y-auto p-5 space-y-5"
          style={{ background: 'var(--color-bg-2)', borderColor: 'var(--color-glass-border)' }}>

          {/* Room info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Thông tin phòng</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Rạp chiếu</label>
                <select value={theaterId} onChange={e => setTheaterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
                  <option value="">-- Chọn rạp --</option>
                  {theaters.map((t: any) => <option key={t._id} value={t._id}>{t.name} - {t.city}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Loại phòng</label>
                <select value={roomType} onChange={e => handleRoomTypeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}>
                  {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Tên phòng</label>
                <input value={roomName} onChange={e => setRoomName(e.target.value)}
                  placeholder="VD: Phòng 1, IMAX Hall..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-3)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }} />
              </div>
            </div>
          </div>

          {/* Grid size */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Kích thước lưới</h3>
            <div className="space-y-3">
              {[{ label: 'Số hàng', val: rows, min: 1, max: 20, set: (v: number) => { setRows(v); rebuildGrid(v, cols) } },
                { label: 'Số cột', val: cols, min: 1, max: 24, set: (v: number) => { setCols(v); rebuildGrid(rows, v) } }
              ].map(({ label, val, min, max, set }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{val}</span>
                  </div>
                  <input type="range" min={min} max={max} value={val} onChange={e => set(+e.target.value)}
                    className="w-full accent-cyan-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Brush type + price editor */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Công cụ vẽ</h3>
            <div className="space-y-2">
              {(Object.entries(seatColors) as [SeatType, any][]).map(([type, cfg]) => (
                <div key={type}>
                  <button onClick={() => setBrushType(type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                    style={{
                      background: brushType === type ? `${cfg.border}18` : 'var(--color-bg-3)',
                      border: `2px solid ${brushType === type ? cfg.border : 'transparent'}`,
                    }}>
                    <div className="w-8 h-6 rounded flex-shrink-0" style={{
                      background: type === 'aisle' || type === 'empty' ? 'rgba(255,255,255,0.05)' : cfg.bg,
                      border: `1.5px solid ${cfg.border || 'rgba(255,255,255,0.1)'}`,
                    }} />
                    <div className="flex-1">
                      <div style={{ color: brushType === type ? cfg.border : 'var(--color-text)' }}>{cfg.label}</div>
                      {cfg.price && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cfg.price}</div>}
                    </div>
                  </button>

                  {/* Input chỉnh giá */}
                  {['standard','vip','couple','recliner'].includes(type) && (
                    <div className="flex items-center gap-2 mt-1 px-2">
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>Giá:</span>
                      <input
                        type="number"
                        step={5000}
                        min={0}
                        value={customPrices[type] ?? 0}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setCustomPrices(prev => ({ ...prev, [type]: +e.target.value }))}
                        className="w-full px-2 py-1 rounded-lg text-xs text-right outline-none"
                        style={{
                          background: 'var(--color-bg-3)',
                          border: `1px solid ${cfg.border}40`,
                          color: cfg.border,
                        }}
                      />
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>đ</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Thống kê</h3>
            <div className="space-y-2">
              {Object.entries(stats).filter(([t]) => t !== 'aisle').map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span style={{ color: seatColors[type as SeatType]?.border || 'var(--color-text-muted)' }}>
                    {seatColors[type as SeatType]?.label}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>{count} ghế</span>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between text-sm font-bold" style={{ borderColor: 'var(--color-glass-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tổng</span>
                <span style={{ color: 'var(--color-primary)' }}>{Object.values(stats).reduce((a, b) => a + b, 0)} ghế</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN: Grid designer ── */}
        <div className="flex-1 overflow-auto p-8 flex flex-col items-center">
          {/* Screen */}
          <div className="mb-8 w-full max-w-2xl">
            <div className="h-3 rounded-t-[50%] mx-auto mb-1"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)', maxWidth: '80%' }} />
            <div className="text-center text-xs uppercase tracking-[0.4em]" style={{ color: 'var(--color-text-dim)' }}>MÀN HÌNH</div>
          </div>

          {/* Seat grid */}
          <div className="select-none"
            onMouseLeave={() => setIsPainting(false)}>
            {grid.map((rowSeats, ri) => (
              <div key={rowSeats[0]?.row} className="flex items-center gap-1 mb-1">
                {/* Row label */}
                <div className="w-5 text-xs text-center font-mono flex-shrink-0" style={{ color: 'var(--color-text-dim)' }}>
                  {rowSeats[0]?.row}
                </div>

                {rowSeats.map((seat, ci) => {
                  const cfg = seatColors[seat.type]
                  const isEmpty = seat.type === 'empty'
                  const isAisle = seat.type === 'aisle'
                  const isCouple = seat.type === 'couple'

                  if (isCouple && ci % 2 === 1 && rowSeats[ci - 1]?.type === 'couple') {
                    return null
                  }

                  const coupleWidth = isCouple ? 60 : 28

                  return (
                    <div key={`${seat.row}-${seat.number}`}
                      className="flex-shrink-0 transition-all cursor-pointer rounded relative"
                      style={{
                        width: coupleWidth,
                        height: 22,
                        background: isAisle || isEmpty ? 'transparent' : cfg.bg,
                        border: isAisle || isEmpty ? '1px dashed rgba(255,255,255,0.08)' : `1.5px solid ${cfg.border}`,
                        opacity: isAisle ? 0.3 : 1,
                      }}
                      onMouseDown={() => { setIsPainting(true); paintSeat(seat.row, seat.number) }}
                      onMouseEnter={() => { if (isPainting) paintSeat(seat.row, seat.number) }}
                      onMouseUp={() => setIsPainting(false)}
                      title={isCouple ? `${seat.row}${seat.number}-${seat.number + 1} - Ghế Đôi` : `${seat.row}${seat.number} - ${cfg.label}`}
                    >
                      {isCouple && (
                        <div className="absolute inset-y-1 left-1/2 w-px" style={{ background: `${cfg.border}60` }} />
                      )}
                    </div>
                  )
                })}

                {/* Col numbers on first row */}
                {ri === 0 && (
                  <div className="flex gap-1 absolute opacity-0 pointer-events-none">
                    {rowSeats.map((_, ci) => (
                      <div key={ci} className="w-7 text-center text-xs" style={{ color: 'var(--color-text-dim)' }}>{ci + 1}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-8 flex-wrap justify-center">
            {Object.entries(seatColors).filter(([t]) => t !== 'empty').map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className="w-6 h-5 rounded" style={{ background: type === 'aisle' ? 'rgba(255,255,255,0.05)' : cfg.bg, border: `1.5px solid ${cfg.border || 'rgba(255,255,255,0.1)'}` }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{cfg.label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs mt-4" style={{ color: 'var(--color-text-dim)' }}>
            💡 Giữ chuột và kéo để vẽ nhiều ghế cùng lúc
          </p>
        </div>
      </div>

      {/* ── PREVIEW MODAL ── */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-auto"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  {roomName || 'Phòng chưa đặt tên'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Preview sơ đồ ghế — chỉ xem, không chỉnh sửa
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-lg leading-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Screen */}
            <div className="mb-6">
              <div className="h-2 rounded-t-[50%] mx-auto mb-1"
                style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)', maxWidth: '70%' }} />
              <div className="text-center text-xs uppercase tracking-[0.4em]"
                style={{ color: 'var(--color-text-dim)' }}>MÀN HÌNH</div>
            </div>

            {/* Seat grid (read-only) */}
            <div className="flex flex-col items-center select-none overflow-auto">
              {grid.map((rowSeats) => (
                <div key={rowSeats[0]?.row} className="flex items-center gap-1 mb-1">
                  <div className="w-5 text-xs text-center font-mono flex-shrink-0"
                    style={{ color: 'var(--color-text-dim)' }}>
                    {rowSeats[0]?.row}
                  </div>
                  {rowSeats.map((seat, ci) => {
                    const cfg = seatColors[seat.type]
                    const isCouple = seat.type === 'couple'
                    const isAisle = seat.type === 'aisle'
                    const isEmpty = seat.type === 'empty'

                    if (isCouple && ci % 2 === 1 && rowSeats[ci - 1]?.type === 'couple') return null

                    return (
                      <div
                        key={`prev-${seat.row}-${seat.number}`}
                        className="flex-shrink-0 rounded relative"
                        style={{
                          width: isCouple ? 60 : 28,
                          height: 22,
                          background: isAisle || isEmpty ? 'transparent' : cfg.bg,
                          border: isAisle || isEmpty
                            ? '1px dashed rgba(255,255,255,0.08)'
                            : `1.5px solid ${cfg.border}`,
                          opacity: isAisle ? 0.3 : 1,
                        }}
                        title={isCouple
                          ? `${seat.row}${seat.number}-${seat.number + 1} - Ghế Đôi`
                          : `${seat.row}${seat.number} - ${cfg.label}`}
                      >
                        {isCouple && (
                          <div className="absolute inset-y-1 left-1/2 w-px"
                            style={{ background: `${cfg.border}60` }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend + prices */}
            <div className="flex gap-4 mt-6 flex-wrap justify-center">
              {Object.entries(seatColors).filter(([t]) => t !== 'empty').map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-5 rounded" style={{
                    background: type === 'aisle' ? 'rgba(255,255,255,0.05)' : cfg.bg,
                    border: `1.5px solid ${cfg.border || 'rgba(255,255,255,0.1)'}`
                  }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>{cfg.label}</span>
                  {cfg.price && (
                    <span className="font-medium" style={{ color: cfg.border }}>{cfg.price}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Stats summary */}
            <div className="mt-4 pt-4 border-t flex gap-4 flex-wrap justify-center"
              style={{ borderColor: 'var(--color-glass-border)' }}>
              {Object.entries(stats).filter(([t]) => t !== 'aisle' && t !== 'empty').map(([type, count]) => (
                <div key={type} className="text-xs text-center">
                  <div className="font-bold" style={{ color: seatColors[type as SeatType]?.border }}>
                    {count}
                  </div>
                  <div style={{ color: 'var(--color-text-dim)' }}>{seatColors[type as SeatType]?.label}</div>
                </div>
              ))}
              <div className="text-xs text-center">
                <div className="font-bold" style={{ color: 'var(--color-primary)' }}>
                  {Object.entries(stats).filter(([t]) => t !== 'aisle' && t !== 'empty').reduce((a, [, b]) => a + b, 0)}
                </div>
                <div style={{ color: 'var(--color-text-dim)' }}>Tổng ghế</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}