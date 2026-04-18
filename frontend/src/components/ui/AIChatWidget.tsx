import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { movieApi } from '../../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  movies?: MovieSuggestion[]
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

// Render markdown đơn giản: **chữ** → <strong>
function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{part}</strong> : part
  )
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🍿 Xin chào! Mình là PopBot!\n\nHãy kể cho mình nghe để gợi ý phim phù hợp nhất:\n• Đi với ai? (hẹn hò, gia đình, bạn bè...)\n• Tâm trạng thế nào? (vui, buồn, hồi hộp...)\n• Thích thể loại gì không?',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [movies, setMovies] = useState<MovieSuggestion[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    movieApi.getAll({ limit: 50 }).then(res => {
      setMovies(res.data.data?.movies || res.data.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const movieList = movies.map(m => ({
        id: m._id,
        title: m.title,
        genres: m.genres,
        rating: m.rating,
        duration: m.duration,
        status: m.status,
      }))

      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

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

      // Match PHIM_ID từ response
      const movieIdMatches = [...text.matchAll(/\[PHIM_ID:\s*["']?([a-f0-9]+)["']?\s*\]/g)]
      const suggestedIds = movieIdMatches.map((m: any) => m[1])

      // Match theo ID trước, nếu không có thì match theo title trong text
      let suggestedMovies = movies.filter(m => suggestedIds.includes(m._id))

      // Fallback: nếu không match được ID, tìm tên phim trong text
      if (suggestedMovies.length === 0) {
        suggestedMovies = movies.filter(m =>
          text.toUpperCase().includes(m.title.toUpperCase())
        ).slice(0, 3)
      }

      // Xóa tag PHIM_ID khỏi text hiển thị
      const cleanText = text.replace(/\[PHIM_ID:\s*["']?[a-f0-9]+["']?\s*\]/g, '').trim()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanText,
        movies: suggestedMovies.length > 0 ? suggestedMovies : undefined,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, mình đang gặp sự cố. Bạn thử lại sau nhé! 🙏',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = (movieId: string) => {
    navigate(`/movies/${movieId}`)
    setOpen(false)
  }

  const handleShowtimes = (movieId: string) => {
    navigate(`/showtimes?movieId=${movieId}`)
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
          boxShadow: '0 8px 32px rgba(168,85,247,0.5)',
        }}
        title="PopBot - AI tư vấn phim"
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
          className="fixed bottom-24 right-0 left-0 mx-3 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl overflow-hidden flex flex-col"
          style={{
            height: '560px',
            background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Header */}
          <div className="relative p-4 flex items-center gap-3 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(124,58,237,0.15) 100%)',
              borderBottom: '1px solid rgba(168,85,247,0.2)',
            }}>
            <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #A855F7, transparent)' }} />
            <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 4px 12px rgba(168,85,247,0.4)' }}>
              🤖
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm tracking-wide" style={{ color: '#fff' }}>PopBot</div>
              <div className="text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ boxShadow: '0 0 6px #4ade80' }}></span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sẵn sàng tư vấn phim</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,85,247,0.2) transparent' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                    style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
                    🤖
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === 'user' ? {
                      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                      color: 'white',
                      borderBottomRightRadius: 4,
                      boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                    } : {
                      background: 'rgba(255,255,255,0.06)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderBottomLeftRadius: 4,
                    }}
                  >
                    {/* Render markdown **chữ** → bold */}
                    {renderMarkdown(msg.content)}
                  </div>

                  {/* Card phim */}
                  {msg.movies && msg.movies.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.movies.map(movie => (
                        <div key={movie._id} className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
                          style={{
                            background: 'rgba(168,85,247,0.08)',
                            border: '1px solid rgba(168,85,247,0.2)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                          }}>
                          <div className="flex gap-3 p-3">
                            {movie.poster && (
                              <img src={movie.poster} alt={movie.title}
                                className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                            <div className="flex-1 min-w-0 py-0.5">
                              <div className="font-bold text-xs leading-tight truncate" style={{ color: '#fff' }}>
                                {movie.title}
                              </div>
                              <div className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#A855F7' }}>
                                ⭐ <span>{movie.rating?.toFixed(1)}</span>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                                <span>{movie.duration} phút</span>
                              </div>
                              <div className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {movie.genres?.join(' · ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                            <button onClick={() => handleBooking(movie._id)}
                              className="flex-1 py-2.5 text-xs font-semibold transition-all hover:bg-purple-500/20 flex items-center justify-center gap-1"
                              style={{ color: '#A855F7' }}>
                              🎟️ Đặt vé
                            </button>
                            <div style={{ width: 1, background: 'rgba(168,85,247,0.15)' }} />
                            <button onClick={() => handleShowtimes(movie._id)}
                              className="flex-1 py-2.5 text-xs font-semibold transition-all hover:bg-white/5 flex items-center justify-center gap-1"
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
                  style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
                  🤖
                </div>
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
          <div className="p-3"
            style={{
              borderTop: '1px solid rgba(168,85,247,0.15)',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
            }}>
            <div className="flex gap-2 items-center w-full">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Nhắn tin với PopBot..."
                className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  color: '#fff',
                }}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                  boxShadow: '0 4px 12px rgba(168,85,247,0.4)',
                }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-2 text-xs flex items-center justify-center gap-1"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span>🍿</span>
              <span>Powered by Popcorn AI</span>
              <span>✨</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}