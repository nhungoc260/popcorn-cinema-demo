import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Star, Clock, Play, ChevronLeft, Ticket, MapPin, Calendar } from 'lucide-react'
import { movieApi } from '../api'
import MovieCard from '../components/movie/MovieCard'
import { MovieCardSkeleton } from '../components/ui/Skeletons'

export default function HomePage() {
  const navigate = useNavigate()
  const [heroIdx, setHeroIdx] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: nowShowingData, isLoading: loadingNow } = useQuery({
    queryKey: ['movies', 'now_showing'],
    queryFn: () => movieApi.getAll({ status: 'now_showing', limit: 8 }),
  })
  const { data: comingSoonData, isLoading: loadingComing } = useQuery({
    queryKey: ['movies', 'coming_soon'],
    queryFn: () => movieApi.getAll({ status: 'coming_soon', limit: 4 }),
  })

  const nowShowing: any[] = nowShowingData?.data?.data || []
  const comingSoon: any[] = comingSoonData?.data?.data || []
  const heroMovies = nowShowing.slice(0, 5)

  // Auto slideshow
  useEffect(() => {
    if (!autoPlay || heroMovies.length < 2) return
    timerRef.current = setInterval(() => setHeroIdx(i => (i + 1) % heroMovies.length), 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoPlay, heroMovies.length])

  const goHero = (idx: number) => {
    setHeroIdx((idx + heroMovies.length) % heroMovies.length)
    setAutoPlay(false)
    setTimeout(() => setAutoPlay(true), 12000)
  }

  const hero = heroMovies[heroIdx]

  return (
    <div style={{ background: 'var(--color-bg)' }}>

      {/* ════════════════════════════════════════════════
          HERO — Cinematic movie slideshow
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>

        {/* Background poster */}
        <AnimatePresence mode="sync">
          {hero && (
            <motion.div key={`bg-${heroIdx}`}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0"
              style={{ backgroundImage: `url(${hero.poster})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(3px)' }}
            />
          )}
        </AnimatePresence>

        {/* Overlays */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(8,12,24,0.97) 38%, rgba(8,12,24,0.65) 65%, rgba(8,12,24,0.25) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,12,24,1) 0%, transparent 45%)' }} />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center min-h-screen pt-20 pb-20 gap-12">

          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {hero && (
                <motion.div key={`info-${heroIdx}`}
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.45 }}>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
                    style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: 'var(--color-primary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-cyan-400" />
                    Đang chiếu tại rạp
                  </div>

                  <h1 className="font-display font-bold leading-tight mb-4"
                    style={{ color: 'white', fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)', textShadow: '0 2px 30px rgba(0,0,0,0.6)', letterSpacing: '0.01em' }}>
                    {hero.title}
                  </h1>

                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {hero.genre?.map((g: string) => (
                      <span key={g} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
                        {g}
                      </span>
                    ))}
                    {hero.duration && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        <Clock className="w-3 h-3" /> {hero.duration} phút
                      </span>
                    )}
                    {hero.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#FDE68A' }}>
                        <Star className="w-3 h-3 fill-current" /> {hero.rating}/10
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed mb-8 line-clamp-3"
                    style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 480 }}>
                    {hero.description || 'Bộ phim đang được chiếu tại hệ thống rạp Popcorn Cinema.'}
                  </p>

                  <div className="flex gap-3 flex-wrap">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/showtimes')}
                      className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold"
                      style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 24px rgba(168,85,247,0.45)', fontSize: 15 }}>
                      <Ticket className="w-4 h-4" /> Đặt Vé Ngay
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/movies/${hero._id}`)}
                      className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', fontSize: 15 }}>
                      <Play className="w-4 h-4" /> Chi tiết
                    </motion.button>
                  </div>

                  {/* Thumbnail strip */}
                  {heroMovies.length > 1 && (
                    <div className="flex gap-2 mt-10">
                      {heroMovies.map((m: any, i: number) => (
                        <motion.button key={m._id} onClick={() => goHero(i)}
                          whileHover={{ scale: 1.08 }}
                          style={{
                            width: 48, height: 68, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                            border: `2px solid ${i === heroIdx ? 'var(--color-primary)' : 'transparent'}`,
                            opacity: i === heroIdx ? 1 : 0.45,
                            transition: 'all 0.25s',
                          }}>
                          <img src={m.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: large poster */}
          <AnimatePresence mode="wait">
            {hero && (
              <motion.div key={`poster-${heroIdx}`}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="hidden lg:block flex-shrink-0">
                <div style={{ width: 260, borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                  <img src={hero.poster} alt="" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Prev/Next */}
        {heroMovies.length > 1 && (
          <>
            <button onClick={() => goHero(heroIdx - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--color-glass-border)', color: 'white' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => goHero(heroIdx + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--color-glass-border)', color: 'white' }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {heroMovies.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {heroMovies.map((_: any, i: number) => (
              <button key={i} onClick={() => goHero(i)}
                className="rounded-full transition-all"
                style={{ width: i === heroIdx ? 22 : 6, height: 6, background: i === heroIdx ? 'var(--color-primary)' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════
          QUICK ACTIONS
      ════════════════════════════════════════════════ */}
      <section className="py-8 px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/showtimes', emoji: '🎟', label: 'Đặt Vé',       desc: 'Chọn ngày & giờ',     color: 'var(--color-primary)' },
              { to: '/movies',    emoji: '🎬', label: 'Xem Phim',      desc: 'Danh sách phim hot',  color: '#FDE68A' },
              { to: '/theaters',  emoji: '🏛', label: 'Rạp Chiếu',     desc: 'Địa điểm & bản đồ',  color: '#F472B6' },
              { to: '/my-bookings', emoji: '🎫', label: 'Vé Của Tôi', desc: 'Lịch sử đặt vé',      color: 'var(--color-text-muted)' },
            ].map(({ to, emoji, label, desc, color }) => (
              <motion.div key={to} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link to={to} className="flex flex-col items-center text-center p-5 rounded-2xl block"
                  style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                  <span className="text-3xl mb-2">{emoji}</span>
                  <span className="font-bold text-sm" style={{ color }}>{label}</span>
                  <span className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{desc}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          NOW SHOWING
      ════════════════════════════════════════════════ */}
      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,var(--color-primary),var(--color-primary-dark))' }} />
              <h2 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>Phim Đang Chiếu</h2>
            </div>
            <Link to="/movies" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loadingNow
              ? Array.from({ length: 8 }).map((_, i) => <MovieCardSkeleton key={i} />)
              : nowShowing.map((m: any) => <MovieCard key={m._id} movie={m} />)
            }
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          COMING SOON
      ════════════════════════════════════════════════ */}
      {comingSoon.length > 0 && (
        <section className="py-10 px-4" style={{ background: 'var(--color-bg-2)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#FDE68A,#F59E0B)' }} />
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)' }}>Phim Sắp Chiếu</h2>
              </div>
              <Link to="/movies?status=coming_soon" className="flex items-center gap-1 text-sm font-medium" style={{ color: '#FDE68A' }}>
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {loadingComing
                ? Array.from({ length: 4 }).map((_, i) => <MovieCardSkeleton key={i} />)
                : comingSoon.map((m: any) => <MovieCard key={m._id} movie={m} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          WHY POPCORN CINEMA
      ════════════════════════════════════════════════ */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--color-text)' }}>Tại sao chọn Popcorn Cinema?</h2>
          <p className="text-sm mb-10" style={{ color: 'var(--color-text-muted)' }}>Hệ thống đặt vé rạp chiếu phim thông minh nhất Việt Nam</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '⚡', title: 'Đặt vé siêu nhanh', desc: '3 bước đơn giản', color: 'var(--color-primary)' },
              { icon: '🔒', title: 'Thanh toán an toàn', desc: 'MoMo · VietQR · CK', color: '#FDE68A' },
              { icon: '📱', title: 'Vé QR điện tử', desc: 'Check-in nhanh chóng', color: '#F472B6' },
              { icon: '🎯', title: 'Chọn ghế yêu thích', desc: 'VIP · Đôi · Thường', color: 'var(--color-text-muted)' },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="p-5 rounded-2xl"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-sm mb-1" style={{ color }}>{title}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}