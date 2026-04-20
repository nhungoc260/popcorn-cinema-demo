import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor – attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    if (original.url?.includes('/auth/') || original._retry) {
      return Promise.reject(err)
    }

    if (err.response?.status === 401) {
      const { refresh, setAuth, logout, user } = useAuthStore.getState()

      if (!refresh) {
        logout()
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }).catch(e => Promise.reject(e))
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refresh })
        const newAccess = data.data.access
        const newRefresh = data.data.refresh

        setAuth(user!, newAccess, newRefresh)
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`
        original.headers.Authorization = `Bearer ${newAccess}`

        processQueue(null, newAccess)
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) => api.post('/auth/register', data),
  logout: (refresh: string) => api.post('/auth/logout', { refresh }),
  getMe: () => api.get('/auth/me'),
  sendOtp: (email: string) => api.post('/auth/send-otp', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  googleLogin: (credential: string) => api.post('/auth/google', { credential }),
  phoneSend: (phone: string) => api.post('/auth/phone-send', { phone }),
  phoneVerify: (phone: string, otp: string) => api.post('/auth/phone-verify', { phone, otp }),
  resetPassword: (email: string, otp: string, newPassword: string) => api.post('/auth/reset-password', { email, otp, newPassword }),
  verifyOtp: (email: string, otp: string) => api.post('/auth/verify-otp', { email, otp }),
}

// ── Movies ─────────────────────────────────────────────────
export const movieApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/movies', { params }),
  getOne: (id: string) => api.get(`/movies/${id}`),
  create: (data: unknown) => api.post('/movies', data),
  update: (id: string, data: unknown) => api.put(`/movies/${id}`, data),
  delete: (id: string) => api.delete(`/movies/${id}`),
}

// ── Showtimes ──────────────────────────────────────────────
export const showtimeApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/showtimes', { params }),
  getOne: (id: string) => api.get(`/showtimes/${id}`),
  getSeats: (id: string) => api.get(`/showtimes/${id}/seats`),
  create: (data: unknown) => api.post('/admin/showtimes', data),
  update: (id: string, data: unknown) => api.put(`/admin/showtimes/${id}`, data),
  delete: (id: string) => api.delete(`/admin/showtimes/${id}`),
}

// ── Theaters ───────────────────────────────────────────────
export const theaterApi = {
  getAll: () => api.get('/theaters'),
  getOne: (id: string) => api.get(`/theaters/${id}`),
}

// ── Bookings ───────────────────────────────────────────────
export const bookingApi = {
  create: (showtimeId: string, seatIds: string[], extraData?: Record<string, any>) =>
    api.post('/bookings', { showtimeId, seatIds, ...extraData }),
  getMy: () => api.get('/bookings/my'),
  getOne: (id: string) => api.get(`/bookings/${id}`),
  cancel: (id: string) => api.patch(`/bookings/${id}/cancel`),
  checkIn: (bookingCode: string) => api.post('/bookings/check-in', { bookingCode }),
  createCounter: (showtimeId: string, seatIds: string[], customerId?: string, guestInfo?: { name: string; phone: string }) =>
    api.post('/bookings', { showtimeId, seatIds, isCounterSale: true, ...(customerId ? { customerId } : {}), ...(guestInfo ? { guestName: guestInfo.name, guestPhone: guestInfo.phone } : {}) }),
}

// ── Payments ───────────────────────────────────────────────
export const paymentApi = {
  initiate: (bookingId: string, method: string, finalAmount?: number, pointsUsed?: number) => api.post('/payments/initiate', { bookingId, method, finalAmount, pointsUsed }),
  confirm: (transactionId: string) => api.post('/payments/confirm', { transactionId }),
  adminConfirm: (paymentId: string) => api.post('/payments/admin-confirm', { paymentId }),
  adminReject: (paymentId: string, reason: string) => api.post('/payments/admin-reject', { paymentId, reason }),
  getPending: () => api.get('/payments/pending'),
  getStatus: (txnId: string) => api.get(`/payments/status/${txnId}`),
  getOne: (id: string) => api.get(`/payments/${id}`),
}

// ── Admin ──────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  updateUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}/detail`),
  toggleUserStatus: (id: string) => api.patch(`/admin/users/${id}/status`),
  // [MỚI] Quản lý hóa đơn
  getInvoices: (params?: Record<string, unknown>) => api.get('/admin/invoices', { params }),
}

// ── Reviews ────────────────────────────────────────────────
export const reviewApi = {
  getAll: (movieId: string, page = 1) => api.get(`/movies/${movieId}/reviews?page=${page}`),
  create: (movieId: string, data: { rating: number; comment: string }) => api.post(`/movies/${movieId}/reviews`, data),
  delete: (movieId: string, id: string) => api.delete(`/movies/${movieId}/reviews/${id}`),
}

// ── Coupons ────────────────────────────────────────────────
export const couponApi = {
  validate: (code: string, amount: number) => api.post('/coupons/validate', { code, amount }),
  apply: (code: string) => api.post('/coupons/apply', { code }),
  getMyLoyalty: () => api.get('/coupons/loyalty'),
}

// ── Reports ────────────────────────────────────────────────
export const reportApi = {
  getRevenue: (period: string) => api.get(`/reports/revenue?period=${period}`),
  getOccupancy: () => api.get('/reports/occupancy'),
}

export const analyticsApi = {
  getMyBehavior:    () => api.get('/reports/user-behavior/me'),
  getUserBehavior:  (id: string) => api.get(`/reports/user-behavior/${id}`),
  getUserTrends:    () => api.get('/reports/admin/user-trends'),
};

export default api