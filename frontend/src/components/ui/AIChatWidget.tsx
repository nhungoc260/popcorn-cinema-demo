import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { movieApi } from '../../api'
import { useAuthStore } from '../../store/authStore'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  movies?: MovieSuggestion[]
  isEscalated?: boolean
  showtimes?: ShowtimeInfo[]
  bookingInfo?: BookingInfo | null
}

interface MovieSuggestion {
  _id: string
  title: string
  poster: string
  genres: string[]
  rating: number
  duration: number
  status: string
}

// ✅ THÊM: Interface cho showtime
interface ShowtimeInfo {
  _id: string
  startTime: string
  room?: { name: string }
  theater?: { name: string }
  price: number
  availableSeats?: number
}

// ✅ THÊM: Interface cho booking
interface BookingInfo {
  _id: string
  status: string
  totalAmount: number
  seatLabels?: string[]
  showtime?: {
    startTime: string
    movie?: { title: string }
    room?: { name: string }
  }
}

const ESCALATE_KEYWORDS = [
  'đặt nhầm', 'hoàn vé', 'đổi vé', 'hủy vé', 'thanh toán lỗi',
  'không thanh toán được', 'mất tiền', 'không nhận được vé',
  'sự cố', 'lỗi', 'khiếu nại', 'gặp nhân viên', 'hỗ trợ trực tiếp',
  'nói chuyện với người', 'cần giúp đỡ gấp', 'khẩn cấp'
]

// ✅ THÊM: Từ khóa hỏi giờ chiếu
const SHOWTIME_KEYWORDS = [
  'chiếu lúc', 'giờ chiếu', 'suất chiếu', 'lịch chiếu',
  'chiếu mấy giờ', 'chiếu khi nào', 'còn suất', 'xem lúc'
]

// ✅ THÊM: Từ khóa tra booking
const BOOKING_KEYWORDS = [
  'mã đặt vé', 'mã booking', 'kiểm tra vé', 'tra vé',
  'trạng thái vé', 'vé của tôi', 'đơn của tôi', 'TXN_', 'BK'
]

function shouldEscalate(text: string) {
  return ESCALATE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))
}

// ✅ THÊM: Detect hỏi giờ chiếu
function shouldCheckShowtime(text: string) {
  return SHOWTIME_KEYWORDS.some(kw => text.toLowerCase().includes(kw))
}

// ✅ THÊM: Detect tra booking — tìm mã dạng chữ+số >= 6 ký tự
function extractBookingId(text: string): string | null {
  if (!BOOKING_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) return null
  const match = text.match(/[A-Z0-9_]{6,}/i)
  return match ? match[0] : null
}

function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{part}</strong>
      : part
  )
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: '⏳ Chờ xác nhận', color: '#FDE68A' },
  confirmed: { label: '✅ Đã xác nhận',  color: '#4ade80' },
  cancelled: { label: '❌ Đã hủy',       color: '#F87171' },
  completed: { label: '🎬 Đã hoàn thành', color: '#A855F7' },
  refunded:  { label: '💸 Đã hoàn tiền', color: '#60a5fa' },
}

function StaffCard({ supportMsg, setSupportMsg, supportSent, supportLoading, onSend }: any) {
  return (
    <div className="rounded-2xl overflow-hidden mt-2"
      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">👩‍💼</span>
          <span className="text-xs font-bold" style={{ color: '#4ade80' }}>Nhân viên hỗ trợ</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto"
            style={{ boxShadow: '0 0 6px #4ade80' }} />
        </div>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Hỗ trợ từ <strong style={{ color: '#fff' }}>8:00 – 22:00</strong> mỗi ngày
        </p>
        {!supportSent ? (
          <div className="mb-3">
            <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Mô tả vấn đề — nhân viên sẽ xử lý:
            </p>
            <textarea
              value={supportMsg}
              onChange={e => setSupportMsg(e.target.value)}
              placeholder="VD: Tôi đặt nhầm suất chiếu, muốn đổi sang suất 20h..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none mb-2"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(34,197,94,0.3)', color: '#fff' }}
            />
            <button onClick={onSend}
              disabled={supportLoading || supportMsg.trim().length < 5}
              className="w-full py-2 rounded-xl text-xs font-bold disabled:opacity-40 mb-2"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}>
              {supportLoading ? 'Đang gửi...' : '📨 Gửi yêu cầu hỗ trợ'}
            </button>
          </div>
        ) : (
          <div className="mb-3 p-2 rounded-xl text-center text-xs"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
            ✅ Đã gửi! Nhân viên sẽ liên hệ bạn sớm.
          </div>
        )}
        <p className="text-xs mb-2 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>— hoặc liên hệ trực tiếp —</p>
        <a href="tel:0765099748"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold mb-2"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}>
          📞 Hotline: 0765 099 748
        </a>
        <div className="rounded-xl p-2.5 mb-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>👩 Ngọc</p>
          <div className="flex gap-2">
            <a href="tel:0708045681" className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              📞 0708 045 681
            </a>
            <a href="mailto:nguyentrannhungoc260@gmail.com" className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
              ✉️ Gmail
            </a>
          </div>
        </div>
        <div className="rounded-xl p-2.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>👩 Thắm</p>
          <div className="flex gap-2">
            <a href="tel:0337109502" className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              📞 0337 109 502
            </a>
            <a href="mailto:dvngoctham005@gmail.com" className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
              ✉️ Gmail
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ✅ THÊM: Card hiển thị giờ chiếu
function ShowtimeCard({ showtimes, movieId, onNavigate }: { showtimes: ShowtimeInfo[], movieId: string, onNavigate: () => void }) {
  if (!showtimes.length) return (
    <div className="mt-2 p-3 rounded-xl text-xs text-center"
      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
      😔 Hiện không có suất chiếu nào
    </div>
  )
  return (
    <div className="mt-2 rounded-xl overflow-hidden"
      style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
      <div className="px-3 py-2 text-xs font-semibold" style={{ color: '#A855F7', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        🕐 Suất chiếu hôm nay & sắp tới
      </div>
      <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
        {showtimes.slice(0, 6).map((st, i) => {
          const time = new Date(st.startTime)
          const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          const dateStr = time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          return (
            <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div>
                <span className="text-xs font-bold" style={{ color: '#fff' }}>{timeStr}</span>
                <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{dateStr}</span>
                {st.room?.name && (
                  <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>· {st.room.name}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {st.availableSeats !== undefined && (
                  <span className="text-xs" style={{ color: st.availableSeats > 10 ? '#4ade80' : '#FDE68A' }}>
                    {st.availableSeats} ghế
                  </span>
                )}
                <span className="text-xs font-semibold" style={{ color: '#A855F7' }}>
                  {(st.price || 0).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={onNavigate}
        className="w-full py-2 text-xs font-semibold"
        style={{ color: '#A855F7', borderTop: '1px solid rgba(168,85,247,0.15)' }}>
        Xem tất cả suất chiếu →
      </button>
    </div>
  )
}

// ✅ THÊM: Card hiển thị trạng thái booking
function BookingCard({ booking }: { booking: BookingInfo }) {
  const statusInfo = STATUS_LABEL[booking.status] || { label: booking.status, color: '#fff' }
  const time = booking.showtime?.startTime ? new Date(booking.showtime.startTime) : null
  return (
    <div className="mt-2 rounded-xl overflow-hidden"
      style={{ background: 'rgba(253,230,138,0.06)', border: '1px solid rgba(253,230,138,0.2)' }}>
      <div className="px-3 py-2 text-xs font-semibold" style={{ color: '#FDE68A', borderBottom: '1px solid rgba(253,230,138,0.15)' }}>
        🎟️ Thông tin đặt vé
      </div>
      <div className="p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Mã booking</span>
          <span className="font-mono font-bold" style={{ color: '#FDE68A' }}>{booking._id?.slice(-8).toUpperCase()}</span>
        </div>
        {booking.showtime?.movie?.title && (
          <div className="flex justify-between">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Phim</span>
            <span className="font-semibold text-right max-w-[60%] truncate" style={{ color: '#fff' }}>
              {booking.showtime.movie.title}
            </span>
          </div>
        )}
        {time && (
          <div className="flex justify-between">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Suất chiếu</span>
            <span style={{ color: '#fff' }}>
              {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              {time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        )}
        {booking.seatLabels?.length && (
          <div className="flex justify-between">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Ghế</span>
            <span style={{ color: '#A855F7', fontWeight: 600 }}>{booking.seatLabels.join(', ')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Tổng tiền</span>
          <span style={{ color: '#FDE68A', fontWeight: 700 }}>
            {(booking.totalAmount || 0).toLocaleString('vi-VN')}đ
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Trạng thái</span>
          <span className="font-bold px-2 py-0.5 rounded-lg text-xs"
            style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function AIChatWidget() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🍿 Xin chào! Mình là PopBot!\n\nMình có thể giúp bạn:\n• 🎬 Gợi ý phim đang chiếu phù hợp\n• 🕐 Xem giờ chiếu — hỏi "phim X chiếu lúc mấy giờ?"\n• 🎟️ Tra trạng thái vé — nhắn mã booking\n• 💳 Hỗ trợ sự cố thanh toán\n• 🎭 Tìm phim theo thể loại yêu thích\n\nBạn cần giúp gì hôm nay?',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [movies, setMovies] = useState<MovieSuggestion[]>([])
  const [isStaffMode, setIsStaffMode] = useState(false)
  const [supportMsg, setSupportMsg] = useState('')
  const [supportSent, setSupportSent] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    movieApi.getAll({ limit: 50 }).then(res => {
      const all = res.data.data?.movies || res.data.data || []
      setMovies(all.filter((m: any) => m.status === 'now_showing'))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const getToken = () => {
    const stored = localStorage.getItem('popcorn-auth')
    return stored ? JSON.parse(stored)?.state?.token : null
  }

  const escalateToStaff = () => {
    setIsStaffMode(true)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '👩‍💼 Mình đã kết nối bạn với nhân viên hỗ trợ!\n\nBạn có thể liên hệ trực tiếp qua các kênh bên dưới. Nhân viên sẽ hỗ trợ bạn nhanh nhất có thể!',
      isEscalated: true,
    }])
  }

  const sendSupportTicket = async () => {
    if (supportMsg.trim().length < 5) return
    setSupportLoading(true)
    try {
      const token = getToken()
      await fetch('/api/v1/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: supportMsg,
          category: 'chat_escalation',
          userName: user?.name || undefined,
          userEmail: user?.email || undefined,
        }),
      })
      setSupportSent(true)
    } catch {}
    finally { setSupportLoading(false) }
  }

  // ✅ THÊM: Fetch giờ chiếu theo movieId
  const fetchShowtimes = async (movieId: string): Promise<ShowtimeInfo[]> => {
    try {
      const res = await fetch(`/api/v1/showtimes?movieId=${movieId}`)
      const data = await res.json()
      const list: ShowtimeInfo[] = data.data?.showtimes || data.data || []
      // Chỉ lấy suất chiếu từ hiện tại trở đi
      const now = new Date()
      return list.filter(s => new Date(s.startTime) >= now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    } catch { return [] }
  }

  // ✅ THÊM: Fetch trạng thái booking
  const fetchBooking = async (bookingId: string): Promise<BookingInfo | null> => {
    try {
      const token = getToken()
      if (!token) return null
      const res = await fetch(`/api/v1/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      return data.data || null
    } catch { return null }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    if (shouldEscalate(userMsg)) {
      setTimeout(() => { setLoading(false); escalateToStaff() }, 800)
      return
    }

    // ✅ THÊM: Tra trạng thái booking
    const bookingId = extractBookingId(userMsg)
    if (bookingId) {
      const booking = await fetchBooking(bookingId)
      setLoading(false)
      if (booking) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Mình tìm thấy thông tin đặt vé của bạn! 🎟️`,
          bookingInfo: booking,
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `😔 Mình không tìm thấy booking **${bookingId}**.\n\nVui lòng kiểm tra lại mã hoặc đảm bảo bạn đã đăng nhập đúng tài khoản nhé!`,
        }])
      }
      return
    }

    // ✅ THÊM: Hỏi giờ chiếu — tìm phim trong câu hỏi
    if (shouldCheckShowtime(userMsg)) {
      const matchedMovie = movies.find(m =>
        userMsg.toUpperCase().includes(m.title.toUpperCase()) ||
        m.title.toUpperCase().includes(userMsg.toUpperCase().split(' ').filter(w => w.length > 2).join(' '))
      )
      if (matchedMovie) {
        const showtimes = await fetchShowtimes(matchedMovie._id)
        setLoading(false)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Đây là lịch chiếu của **${matchedMovie.title}** 🎬`,
          showtimes,
          movies: [matchedMovie],
        }])
        return
      }
    }

    try {
      const movieList = movies.map(m => ({
        id: m._id, title: m.title, genres: m.genres,
        rating: m.rating, duration: m.duration, status: m.status,
      }))

      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userMsg }],
          movies: movieList,
        }),
      })

      const data = await response.json()
      const text = data.data?.text || 'Xin lỗi, mình không hiểu. Bạn có thể nói rõ hơn không?'

      const movieIdMatches = [...text.matchAll(/\[PHIM_ID:\s*["']?([a-f0-9]+)["']?\s*\]/g)]
      const suggestedIds = movieIdMatches.map((m: any) => m[1])
      let suggestedMovies = movies.filter(m => suggestedIds.includes(m._id))
      if (suggestedMovies.length === 0) {
        suggestedMovies = movies.filter(m =>
          text.toUpperCase().includes(m.title.toUpperCase()) &&
          m.status === 'now_showing'
        ).slice(0, 3)
      }
      const cleanText = text.replace(/\[PHIM_ID:\s*["']?[a-f0-9]+["']?\s*\]/g, '').trim()
      const aiCannotHelp = cleanText.includes('nhân viên') || cleanText.includes('hỗ trợ trực tiếp')

      // ✅ THÊM: Nếu AI gợi ý 1 phim và user hỏi giờ chiếu → tự fetch showtime
      let autoShowtimes: ShowtimeInfo[] | undefined
      if (shouldCheckShowtime(userMsg) && suggestedMovies.length === 1) {
        autoShowtimes = await fetchShowtimes(suggestedMovies[0]._id)
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanText,
        movies: suggestedMovies.length > 0 ? suggestedMovies : undefined,
        showtimes: autoShowtimes,
      }])

      if (aiCannotHelp && !isStaffMode) {
        setTimeout(() => escalateToStaff(), 500)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, mình đang gặp sự cố. Bạn thử lại sau nhé! 🙏',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 8px 32px rgba(168,85,247,0.5)' }}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-0 left-0 mx-3 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl flex flex-col"
          style={{
            height: '560px',
            background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="relative p-4 flex items-center gap-3 flex-shrink-0"
            style={{
              background: isStaffMode
                ? 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,163,74,0.1) 100%)'
                : 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(124,58,237,0.15) 100%)',
              borderBottom: '1px solid rgba(168,85,247,0.2)',
            }}>
            <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{
                background: isStaffMode ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
                boxShadow: isStaffMode ? '0 4px 12px rgba(34,197,94,0.4)' : '0 4px 12px rgba(168,85,247,0.4)',
              }}>
              {isStaffMode ? '👩‍💼' : '🤖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: '#fff' }}>
                {isStaffMode ? 'Nhân viên hỗ trợ' : 'PopBot'}
              </div>
              <div className="text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ boxShadow: '0 0 6px #4ade80' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {isStaffMode ? 'Hỗ trợ 8:00 – 22:00' : 'Sẵn sàng tư vấn phim'}
                </span>
              </div>
            </div>
            {!isStaffMode && (
              <button onClick={escalateToStaff}
                className="text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:opacity-80 flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                👩‍💼 Nhân viên
              </button>
            )}
            {isStaffMode && (
              <button onClick={() => setIsStaffMode(false)}
                className="text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:opacity-80 flex-shrink-0"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }}>
                🤖 PopBot
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,85,247,0.2) transparent' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                    style={{ background: msg.isEscalated ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
                    {msg.isEscalated ? '👩‍💼' : '🤖'}
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === 'user' ? {
                      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                      color: 'white', borderBottomRightRadius: 4,
                      boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                    } : {
                      background: msg.isEscalated ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.06)',
                      color: '#e2e8f0',
                      border: msg.isEscalated ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                      borderBottomLeftRadius: 4,
                    }}>
                    {renderMarkdown(msg.content)}
                  </div>

                  {msg.isEscalated && (
                    <StaffCard
                      supportMsg={supportMsg} setSupportMsg={setSupportMsg}
                      supportSent={supportSent} supportLoading={supportLoading}
                      onSend={sendSupportTicket}
                    />
                  )}

                  {/* ✅ THÊM: Hiển thị booking card */}
                  {msg.bookingInfo && <BookingCard booking={msg.bookingInfo} />}

                  {/* ✅ THÊM: Hiển thị showtime card */}
                  {msg.showtimes && msg.movies?.[0] && (
                    <ShowtimeCard
                      showtimes={msg.showtimes}
                      movieId={msg.movies[0]._id}
                      onNavigate={() => { navigate(`/showtimes?movieId=${msg.movies![0]._id}`); setOpen(false) }}
                    />
                  )}

                  {msg.movies && msg.movies.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.movies.map(movie => (
                        <div key={movie._id} className="rounded-xl overflow-hidden"
                          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                          <div className="flex gap-3 p-3">
                            {movie.poster && (
                              <img src={movie.poster} alt={movie.title}
                                className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 py-0.5">
                              <div className="font-bold text-xs truncate" style={{ color: '#fff' }}>{movie.title}</div>
                              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#A855F7' }}>
                                ⭐ {movie.rating?.toFixed(1)}
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                                {movie.duration} phút
                              </div>
                              <div className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {movie.genres?.join(' · ')}
                              </div>
                              <div className="text-xs mt-1 inline-block px-1.5 py-0.5 rounded-md"
                                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: 10 }}>
                                🎬 Đang chiếu
                              </div>
                            </div>
                          </div>
                          <div className="flex" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                            <button onClick={() => { navigate(`/movies/${movie._id}`); setOpen(false) }}
                              className="flex-1 py-2.5 text-xs font-semibold hover:bg-purple-500/20 flex items-center justify-center gap-1"
                              style={{ color: '#A855F7' }}>
                              🎟️ Đặt vé
                            </button>
                            <div style={{ width: 1, background: 'rgba(168,85,247,0.15)' }} />
                            <button onClick={() => { navigate(`/showtimes?movieId=${movie._id}`); setOpen(false) }}
                              className="flex-1 py-2.5 text-xs font-semibold hover:bg-white/5 flex items-center justify-center gap-1"
                              style={{ color: 'rgba(255,255,255,0.5)' }}>
                              🕐 Suất chiếu
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>🤖</div>
                <div className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: 4 }}>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 pt-3 pb-4"
            style={{ borderTop: '1px solid rgba(168,85,247,0.15)', background: 'rgba(0,0,0,0.3)' }}>
            {isStaffMode ? (
              <div className="text-center py-2">
                <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Đang kết nối với nhân viên hỗ trợ</p>
                <div className="space-y-2">
                  <a href="tel:0765099748"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}>
                    📞 Hotline: 0765 099 748
                  </a>
                  <div className="flex gap-2">
                    <a href="tel:0708045681" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                      👩 Ngọc<br />0708 045 681
                    </a>
                    <a href="tel:0337109502" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                      👩 Thắm<br />0337 109 502
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <a href="mailto:nguyentrannhungoc260@gmail.com" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center"
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                      ✉️ Gmail Ngọc
                    </a>
                    <a href="mailto:dvngoctham005@gmail.com" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center"
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                      ✉️ Gmail Thắm
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Nhắn tin với PopBot..."
                  className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', color: '#fff' }}
                  disabled={loading}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 4px 12px rgba(168,85,247,0.4)' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="text-center mt-2 text-xs flex items-center justify-center gap-1"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span>🍿</span><span>Powered by Popcorn AI</span><span>✨</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}