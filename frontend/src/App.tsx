import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import AdminLayout from './components/admin/AdminLayout'
import SocketNotificationBridge from './components/ui/SocketNotificationBridge'

// Customer pages
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import MovieDetailPage from './pages/MovieDetailPage'
import ShowtimesPage from './pages/ShowtimesPage'
import TheatersPage from './pages/TheatersPage'
import BookingPage from './pages/BookingPage'
import SeatSelectionPage from './pages/SeatSelectionPage'
import PaymentPage from './pages/PaymentPage'
import BookingSuccessPage from './pages/BookingSuccessPage'
import MyBookingsPage from './pages/MyBookingsPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import NotFoundPage from './pages/NotFoundPage'
import InvoicePage from './pages/InvoicePage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMovies from './pages/admin/AdminMovies'
import AdminShowtimes from './pages/admin/AdminShowtimes'
import AdminUsers from './pages/admin/AdminUsers'
import AdminReports from './pages/admin/AdminReports'
import AdminPayments from './pages/admin/AdminPayments'
import AdminRooms from './pages/admin/AdminRooms'
import AdminTheaters from './pages/admin/AdminTheaters'
import AdminSeatDesigner from './pages/admin/AdminSeatDesigner'
import AdminSmartSchedule from './pages/admin/AdminSmartSchedule'
import AdminInvoices from './pages/admin/AdminInvoices'

// Staff pages
import StaffCheckIn from './pages/staff/StaffCheckIn'
import StaffCounter from './pages/staff/StaffCounter'

/* =========================
   🔐 PRIVATE ROUTE (FIXED)
========================= */
function PrivateRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: string[]
}) {
  const { user, token } = useAuthStore()

  if (!token) {
    // 🔥 Lưu FULL URL (quan trọng nhất)
    const currentUrl = window.location.pathname + window.location.search
    localStorage.setItem('redirectAfterLogin', currentUrl)

    // 🔥 backup groupRoom (optional nhưng nên có)
    const params = new URLSearchParams(window.location.search)
    const groupRoom = params.get('groupRoom')
    if (groupRoom) {
      localStorage.setItem('pendingGroupRoom', groupRoom)
    }

    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/* =========================
   🛡 ADMIN LAYOUT GUARD
========================= */
function AdminLayoutGuard({ roles }: { roles?: string[] }) {
  const { user, token } = useAuthStore()

  if (!token) {
    const currentUrl = window.location.pathname + window.location.search
    localStorage.setItem('redirectAfterLogin', currentUrl)
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <AdminLayout />
}

/* =========================
   🚀 APP
========================= */
export default function App() {
  const location = useLocation()

  return (
    <div className="noise-overlay min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <SocketNotificationBridge />

      <Routes>

        {/* ── Customer ── */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="movies/:id" element={<MovieDetailPage />} />
          <Route path="showtimes" element={<ShowtimesPage />} />
          <Route path="theaters" element={<TheatersPage />} />

          <Route
            path="booking/:showtimeId"
            element={
              <PrivateRoute>
                <BookingPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 QUAN TRỌNG: giữ key để reload khi query đổi */}
          <Route
            path="seats/:showtimeId"
            element={
              <PrivateRoute>
                <SeatSelectionPage key={location.pathname + location.search} />
              </PrivateRoute>
            }
          />

          <Route
            path="payment/:bookingId"
            element={
              <PrivateRoute>
                <PaymentPage />
              </PrivateRoute>
            }
          />

          <Route
            path="booking-success/:bookingId"
            element={
              <PrivateRoute>
                <BookingSuccessPage />
              </PrivateRoute>
            }
          />

          <Route
            path="my-bookings"
            element={
              <PrivateRoute>
                <MyBookingsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />

          <Route
            path="invoice/:bookingId"
            element={
              <PrivateRoute>
                <InvoicePage />
              </PrivateRoute>
            }
          />
        </Route>

        {/* ── Auth ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* ── Admin ── */}
        <Route path="/admin" element={<AdminLayoutGuard roles={['admin', 'staff']} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="payments" element={<AdminPayments />} />

          <Route
            path="movies"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminMovies />
              </PrivateRoute>
            }
          />

          <Route
            path="showtimes"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminShowtimes />
              </PrivateRoute>
            }
          />

          <Route
            path="users"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminUsers />
              </PrivateRoute>
            }
          />

          <Route
            path="reports"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminReports />
              </PrivateRoute>
            }
          />

          <Route
            path="theaters"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminTheaters />
              </PrivateRoute>
            }
          />

          <Route
            path="rooms"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminRooms />
              </PrivateRoute>
            }
          />

          <Route
            path="seat-designer"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminSeatDesigner />
              </PrivateRoute>
            }
          />

          <Route
            path="seat-designer/:roomId"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminSeatDesigner />
              </PrivateRoute>
            }
          />

          <Route
            path="smart-schedule"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminSmartSchedule />
              </PrivateRoute>
            }
          />

          <Route path="invoices" element={<AdminInvoices />} />
        </Route>

        {/* ── Staff ── */}
        <Route path="/staff" element={<AdminLayoutGuard roles={['admin', 'staff']} />}>
          <Route path="checkin" element={<StaffCheckIn />} />
          <Route path="counter" element={<StaffCounter />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}