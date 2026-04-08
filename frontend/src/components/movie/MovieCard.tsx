import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Clock, Play, Ban } from 'lucide-react'
import TiltCard from '../3d/TiltCard'

interface Movie {
  _id: string
  title: string
  poster: string
  genres: string[]
  rating: number
  duration: number
  status: string
  ageRating: string
}

interface MovieCardProps {
  movie: Movie
  index?: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  now_showing: { label: 'Đang Chiếu',  color: '#A855F7' },
  coming_soon: { label: 'Sắp Chiếu',   color: '#FCD34D' },
  ended:       { label: 'Đã Kết Thúc', color: 'var(--color-text-dim)' },
  suspended:   { label: 'Ngưng Chiếu', color: '#F87171' },
}

const AGE_COLORS: Record<string, string> = {
  P: '#22C55E', C13: '#EAB308', C16: '#F97316', C18: '#EF4444',
}

export default function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const status = STATUS_LABELS[movie.status] || STATUS_LABELS.now_showing
  const isSuspended = movie.status === 'suspended'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard className="group cursor-pointer" intensity={isSuspended ? 0 : 8}>
        <div className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'var(--color-bg-2)',
            border: `1px solid ${isSuspended ? 'rgba(248,113,113,0.35)' : 'var(--color-glass-border)'}`,
            transition: 'all 0.25s',
          }}>

          {/* Poster */}
          <Link to={`/movies/${movie._id}`} className="block relative overflow-hidden aspect-[2/3]">
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              style={{ opacity: isSuspended ? 0.45 : 1 }}
              onError={e => {
                const t = e.currentTarget
                t.onerror = null
                t.src = `https://placehold.co/400x600/1A1726/A855F7?text=${encodeURIComponent(movie.title)}&font=syne`
              }}
            />

            {/* Lớp phủ đỏ nhạt khi suspended */}
            {isSuspended && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'rgba(30,0,0,0.55)', backdropFilter: 'blur(1px)' }}>
                <Ban className="w-10 h-10" style={{ color: '#F87171', opacity: 0.9 }} />
                <span className="text-xs font-bold tracking-wide px-3 py-1 rounded-full"
                  style={{ background: 'rgba(248,113,113,0.2)', color: '#F87171', border: '1px solid rgba(248,113,113,0.4)' }}>
                  Ngưng Chiếu
                </span>
              </div>
            )}

            {/* Gradient overlay (chỉ khi không suspended) */}
            {!isSuspended && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}

            {/* Play button on hover (chỉ khi không suspended) */}
            {!isSuspended && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)' }}>
                  <Play className="w-6 h-6 fill-current ml-1" style={{ color: 'white' }} />
                </div>
              </motion.div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: status.color, border: `1px solid ${status.color}50` }}>
                {isSuspended && '🚫 '}{status.label}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: AGE_COLORS[movie.ageRating] || '#94A3B8', border: `1px solid ${AGE_COLORS[movie.ageRating] || '#94A3B8'}50` }}>
                {movie.ageRating}
              </span>
            </div>

            {/* Rating badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', border: '1px solid rgba(252,211,77,0.35)' }}>
              <Star className="w-3 h-3 fill-current" style={{ color: '#FDE68A' }} />
              <span className="text-xs font-bold" style={{ color: '#FDE68A' }}>{movie.rating.toFixed(1)}</span>
            </div>
          </Link>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-display font-semibold text-lg leading-tight mb-2 line-clamp-2 transition-colors"
              style={{ color: isSuspended ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
              {movie.title}
            </h3>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {movie.genres.slice(0, 2).map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  {g}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{movie.duration} phút</span>
              </div>

              {/* Nút hành động theo status */}
              {isSuspended ? (
                // Disabled — không thể đặt vé
                <span className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-not-allowed select-none"
                  style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)', opacity: 0.7 }}>
                  Ngưng chiếu
                </span>
              ) : movie.status === 'now_showing' ? (
                <Link to={`/movies/${movie._id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', boxShadow: '0 0 10px rgba(168,85,247,0.3)' }}>
                  Đặt Vé
                </Link>
              ) : (
                <Link to={`/movies/${movie._id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/10"
                  style={{ color: 'var(--color-primary)', border: '1px solid rgba(168,85,247,0.3)' }}>
                  Chi Tiết
                </Link>
              )}
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}