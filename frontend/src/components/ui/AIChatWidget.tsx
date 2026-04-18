// src/components/ui/AIChatWidget.tsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { movieApi, showtimeApi } from '../../api'

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
  showtimes?: any[]
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🎬 Xin chào! Mình là trợ lý AI của Popcorn Cinema.\n\nBạn muốn xem phim gì hôm nay? Hãy kể cho mình nghe:\n• Đi với ai? (hẹn hò, gia đình, bạn bè...)\n• Tâm trạng thế nào? (vui, buồn, muốn hồi hộp...)\n• Thích thể loại gì không?',
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

      const systemPrompt = `Bạn là trợ lý AI thân thiện của Popcorn Cinema - rạp chiếu phim tại Việt Nam. 
Nhiệm vụ của bạn là tư vấn phim cho khách hàng dựa trên tâm trạng, hoàn cảnh và sở thích của họ.

Danh sách phim hiện có:
${JSON.stringify(movieList, null, 2)}

Hướng dẫn:
- Trả lời bằng tiếng Việt, thân thiện và nhiệt tình
- Gợi ý 1-3 phim phù hợp nhất từ danh sách trên
- Giải thích tại sao phim đó phù hợp với hoàn cảnh của khách
- Cuối mỗi gợi ý phim, thêm dòng: [PHIM_ID:${'{'}id{'}'}] để hệ thống nhận diện
- Nếu khách hỏi về suất chiếu, giá vé, hãy hướng dẫn họ bấm nút "Đặt vé" 
- Giữ câu trả lời ngắn gọn, dưới 200 từ`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...history,
            { role: 'user', content: userMsg }
          ],
        }),
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || 'Xin lỗi, mình không hiểu. Bạn có thể nói rõ hơn không?'

      // Extract movie IDs from response
      const movieIdMatches = text.matchAll(/\[PHIM_ID:([a-f0-9]+)\]/g)
      const suggestedIds = [...movieIdMatches].map(m => m[1])
      const suggestedMovies = movies.filter(m => suggestedIds.includes(m._id))

      // Clean text
      const cleanText = text.replace(/\[PHIM_ID:[a-f0-9]+\]/g, '').trim()

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
        title="AI tư vấn phim"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">✨</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl overflow-hidden flex flex-col"
          style={{
            height: '520px',
            background: 'var(--color-bg-2, #1a1a2e)',
            border: '1px solid rgba(168,85,247,0.3)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.1)',
          }}
        >
          {/* Header */}
          <div className="p-4 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(124,58,237,0.1))', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
              🎬
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--color-text, #fff)' }}>AI Tư Vấn Phim</div>
              <div className="text-xs flex items-center gap-1" style={{ color: '#A855F7' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                Đang hoạt động
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === 'user' ? {
                      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                      color: 'white',
                      borderBottomRightRadius: 4,
                    } : {
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--color-text, #e2e8f0)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderBottomLeftRadius: 4,
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Movie suggestions */}
                  {msg.movies && msg.movies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.movies.map(movie => (
                        <div key={movie._id} className="rounded-xl overflow-hidden"
                          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                          <div className="flex gap-3 p-3">
                            {movie.poster && (
                              <img src={movie.poster} alt={movie.title}
                                className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs truncate" style={{ color: 'var(--color-text, #fff)' }}>
                                {movie.title}
                              </div>
                              <div className="text-xs mt-1" style={{ color: '#A855F7' }}>
                                ⭐ {movie.rating?.toFixed(1)} • {movie.duration}p
                              </div>
                              <div className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {movie.genres?.join(', ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex border-t" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
                            <button onClick={() => handleBooking(movie._id)}
                              className="flex-1 py-2 text-xs font-semibold transition-colors hover:bg-purple-500/20"
                              style={{ color: '#A855F7' }}>
                              🎟️ Đặt vé
                            </button>
                            <div style={{ width: 1, background: 'rgba(168,85,247,0.2)' }} />
                            <button onClick={() => handleShowtimes(movie._id)}
                              className="flex-1 py-2 text-xs font-semibold transition-colors hover:bg-purple-500/20"
                              style={{ color: 'rgba(255,255,255,0.6)' }}>
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
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid rgba(168,85,247,0.2)', background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Hỏi AI về phim..."
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  color: 'var(--color-text, #fff)',
                }}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Powered by Claude AI ✨
            </div>
          </div>
        </div>
      )}
    </>
  )
}