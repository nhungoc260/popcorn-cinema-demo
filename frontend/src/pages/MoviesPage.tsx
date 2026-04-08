import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { movieApi } from '../api'
import MovieCard from '../components/movie/MovieCard'
import { MovieCardSkeleton } from '../components/ui/Skeletons'

const GENRES = ['Hành Động', 'Hài', 'Drama', 'Kinh Dị', 'Khoa Học Viễn Tưởng', 'Hoạt Hình', 'Tình Cảm', 'Phiêu Lưu', 'Sử Thi']
const STATUS_FILTERS = [
  { value: '', label: 'Tất Cả' },
  { value: 'now_showing', label: 'Đang Chiếu' },
  { value: 'coming_soon', label: 'Sắp Chiếu' },
]

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')

  const { data, isLoading } = useQuery({
    queryKey: ['movies', status],
    queryFn: () => movieApi.getAll({ status: status || undefined, limit: 50 }),
  })

  const allMovies = data?.data?.data || []
  const movies = allMovies.filter((m: any) => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.titleEn?.toLowerCase().includes(search.toLowerCase())
    const matchGenre = !selectedGenre ||
      (m.genres ?? m.genre ?? []).some((g: string) => g.toLowerCase() === selectedGenre.toLowerCase())
    return matchSearch && matchGenre
  })

  const clearFilters = () => { setSearch(''); setSelectedGenre(''); setStatus(''); setSearchParams({}) }
  const hasFilters = search || selectedGenre || status

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display font-bold text-4xl mb-2" style={{ color: 'var(--color-text)' }}>
            Danh Sách <span className="text-gradient-cyan">Phim</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Khám phá hàng trăm bộ phim đang chiếu và sắp chiếu</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm phim..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button key={f.value}
                  onClick={() => { setStatus(f.value); setSearchParams(f.value ? { status: f.value } : {}) }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: status === f.value ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : 'var(--color-bg-2)',
                    color: status === f.value ? 'white' : 'var(--color-text-muted)',
                    border: status === f.value ? 'none' : '1px solid var(--color-glass-border)',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-red-500/10"
                style={{ color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                <X className="w-4 h-4" /> Xóa lọc
              </button>
            )}
          </div>

          {/* Genre pills */}
          <div className="flex gap-2 flex-wrap mt-4">
            <button onClick={() => setSelectedGenre('')}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: !selectedGenre ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: !selectedGenre ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: `1px solid ${!selectedGenre ? 'rgba(168,85,247,0.4)' : 'var(--color-glass-border)'}`,
              }}>
              Tất Cả
            </button>
            {GENRES.map(g => (
              <button key={g} onClick={() => setSelectedGenre(selectedGenre === g ? '' : g)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: selectedGenre === g ? 'rgba(168,85,247,0.15)' : 'transparent',
                  color: selectedGenre === g ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: `1px solid ${selectedGenre === g ? 'rgba(168,85,247,0.4)' : 'var(--color-glass-border)'}`,
                }}>
                {g}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Tìm thấy <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{movies.length}</span> phim
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <MovieCardSkeleton key={i} />)
            : movies.length === 0
            ? (
              <div className="col-span-full text-center py-20">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>Không tìm thấy phim</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>Thử thay đổi từ khóa hoặc bộ lọc</p>
                <button onClick={clearFilters} className="btn-ghost mt-4 text-sm px-4 py-2">Xóa Bộ Lọc</button>
              </div>
            )
            : movies.map((movie: any, i: number) => <MovieCard key={movie._id} movie={movie} index={i} />)
          }
        </div>
      </div>
    </div>
  )
}