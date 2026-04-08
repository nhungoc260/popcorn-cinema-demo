import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, Calendar, MapPin, Tag } from 'lucide-react'
import { movieApi, showtimeApi, theaterApi } from '../api'
import BookingSteps from '../components/booking/BookingSteps'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const fmtPrice = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function BookingPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>()
  const navigate = useNavigate()

  // If we have a showtimeId, go straight to seat selection
  if (showtimeId) {
    navigate(`/seats/${showtimeId}`, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto">
        <BookingSteps currentStep={1} />
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <div className="text-5xl mb-4">🎬</div>
          <p>Chọn phim và suất chiếu để bắt đầu đặt vé</p>
          <Link to="/movies" className="btn-primary inline-block mt-6">Xem Phim</Link>
        </div>
      </div>
    </div>
  )
}
