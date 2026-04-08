# 🎬 Popcorn Cinema – Hệ Thống Đặt Vé Xem Phim Trực Tuyến

> **Cinema booking system** với UI Dark Cinematic, Realtime seat locking bằng Redis + Socket.io, tích hợp thanh toán Việt Nam, và hệ thống quản lý rạp chiếu phim đầy đủ.

---

## 🗂 Cấu Trúc Dự Án

```
popcorn-cinema/
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/          # database.ts, redis.ts
│   │   ├── controllers/     # auth, booking, coupon, movie, payment, report, review, showtime
│   │   ├── middleware/      # errorHandler.ts
│   │   ├── models/          # index.ts (Mongoose schemas)
│   │   ├── routes/          # admin, auth, booking, coupon, movie, payment, report, review, seat, showtime, theater, user
│   │   ├── socket/          # socketServer.ts
│   │   └── utils/           # emailService.ts, smsService.ts, seed.ts
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/             # index.ts – Axios client + toàn bộ API calls
│   │   ├── components/
│   │   │   ├── 3d/          # HeroScene.tsx, TiltCard.tsx
│   │   │   ├── admin/       # AdminLayout.tsx, UserDetailModal.tsx
│   │   │   ├── booking/     # BookingSteps.tsx, CouponInput.tsx, QuickBooking.tsx, SeatGrid.tsx
│   │   │   ├── layout/      # Footer.tsx, Layout.tsx, Navbar.tsx
│   │   │   ├── movie/       # MovieCard.tsx, ReviewSection.tsx
│   │   │   └── ui/          # Logo.tsx, Skeletons.tsx, SocketNotificationBridge.tsx, TierUpgradeModal.tsx
│   │   ├── hooks/           # useNotifications.ts, useSocket.ts
│   │   ├── pages/
│   │   │   ├── admin/       # AdminDashboard, AdminMovies, AdminPayments, AdminReports,
│   │   │   │                # AdminRooms, AdminSeatDesigner, AdminShowtimes, AdminSmartSchedule,
│   │   │   │                # AdminTheaters, AdminUsers
│   │   │   ├── staff/       # StaffCheckIn.tsx, StaffCounter.tsx
│   │   │   └── *.tsx        # BookingPage, BookingSuccessPage, ForgotPasswordPage, HomePage,
│   │   │                    # InvoicePage, LoginPage, MovieDetailPage, MoviesPage,
│   │   │                    # MyBookingsPage, NotFoundPage, PaymentPage, ProfilePage,
│   │   │                    # RegisterPage, SeatSelectionPage, ShowtimesPage, TheatersPage
│   │   ├── store/           # authStore.ts, themeStore.ts
│   │   ├── types/           # global.d.ts
│   │   └── utils/           # toast.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── setup_popcorn_cinema.ps1
└── README.md
```

---

## ⚡ Yêu Cầu Hệ Thống

| Công cụ | Phiên bản |
|---------|-----------|
| Node.js | >= 18.x   |
| MongoDB | >= 7.x    |
| Redis   | >= 7.x    |
| npm     | >= 9.x    |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Bước 1 – Clone repository

```bash
git clone https://github.com/nhungoc260/popcorn-cinema-demo.git
cd popcorn-cinema-demo
```

### Bước 2 – Khởi động MongoDB & Redis

```bash
# MongoDB (Windows Service)
net start MongoDB

# Redis (Windows)
redis-server

# macOS/Linux
brew services start mongodb-community
brew services start redis
```

### Bước 3 – Setup Backend

```bash
cd backend
npm install
cp .env.example .env    # Cấu hình biến môi trường
npm run seed            # Seed dữ liệu mẫu vào database
npm run dev             # Chạy backend tại port 5000
```

### Bước 4 – Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env    # Cấu hình VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm run dev             # Chạy frontend tại port 5173
```

### Bước 5 – Mở trình duyệt

```
🌐 Frontend:    http://localhost:5173
📡 Backend API: http://localhost:5000/api
🏥 Health:      http://localhost:5000/health
```

---

## 👤 Tài Khoản Demo

| Role | Email | Mật khẩu | Trang sau đăng nhập |
|------|-------|----------|---------------------|
| 🔑 Admin | ngocadmin@gmail.vn | admin123 | /admin (Dashboard) |
| 🧑‍💼 Nhân viên | ngocstaff@gmail.com | staff123 | /staff/counter (Quầy vé) |
| 👤 Khách hàng | ngocuser@gmail.com | user123 | / (Trang chủ) |

---

## 🎛 Tính Năng Theo Role

### 🔑 Admin (`/admin`)
- **Dashboard** – Tổng doanh thu, vé đã bán, người dùng, tỉ lệ lấp đầy, biểu đồ 7 ngày
- **Phim** – Thêm/sửa/xóa phim
- **Suất chiếu** – Quản lý lịch chiếu
- **Phòng chiếu** – Thiết kế sơ đồ ghế
- **Smart Schedule** – Lên lịch thông minh
- **Xác nhận CK** – Xác nhận chuyển khoản
- **Check-in** – Quản lý check-in
- **Bán vé quầy** – Bán vé tại rạp
- **Người dùng** – Quản lý tài khoản

### 🧑‍💼 Nhân viên (`/staff`)
- **Quầy Vé** – Chọn phim, suất chiếu, bán vé tại quầy theo ngày
- **Check-in QR** – Quét mã QR vé của khách
- **Xác nhận CK** – Xác nhận thanh toán chuyển khoản
- **Doanh thu** – Xem báo cáo doanh thu
- **Hóa đơn** – In/xuất hóa đơn

### 👤 Khách hàng (`/`)
- Xem danh sách phim, rạp chiếu, suất chiếu
- Đặt vé online – chọn ghế realtime
- Thanh toán (MoMo / VietQR / Chuyển khoản)
- Xem vé QR, lịch sử đặt vé
- Đánh giá phim, quản lý hồ sơ

---

## 🗺 Luồng Đặt Vé

```
[Trang Chủ] → Chọn Phim → Chọn Suất Chiếu
     → [Chọn Ghế] → Lock ghế realtime (Redis 5 phút)
     → [Nhập Coupon] → [Thanh Toán] → MoMo / VietQR / Chuyển khoản
     → [Xác Nhận] → Vé QR Code → Email thông báo
     → [Check-in Staff] → Quét mã QR → Vào rạp ✅
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/v1/auth/register | Đăng ký |
| POST | /api/v1/auth/login | Đăng nhập |
| POST | /api/v1/auth/refresh | Refresh token |
| POST | /api/v1/auth/logout | Đăng xuất |
| GET  | /api/v1/auth/me | Thông tin user hiện tại |
| POST | /api/v1/auth/send-otp | Gửi OTP |
| POST | /api/v1/auth/verify-otp | Xác minh OTP |

### Movies
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/v1/movies | Danh sách phim |
| GET | /api/v1/movies/:id | Chi tiết phim |
| POST | /api/v1/movies | Thêm phim (admin) |
| PUT | /api/v1/movies/:id | Sửa phim (admin) |
| DELETE | /api/v1/movies/:id | Xóa phim (admin) |

### Showtimes
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/v1/showtimes | Danh sách suất chiếu |
| GET | /api/v1/showtimes/:id | Chi tiết suất chiếu |
| GET | /api/v1/showtimes/:id/seats | Trạng thái ghế realtime |

### Bookings
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/v1/bookings | Tạo booking |
| GET | /api/v1/bookings/my | Vé của tôi |
| GET | /api/v1/bookings/:id | Chi tiết booking |
| PATCH | /api/v1/bookings/:id/cancel | Hủy booking |
| POST | /api/v1/bookings/check-in | Check-in (staff) |

### Payments
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/v1/payments/initiate | Khởi tạo thanh toán |
| POST | /api/v1/payments/confirm | Xác nhận thanh toán |
| GET | /api/v1/payments/:id | Chi tiết payment |

### Khác
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | /api/v1/theaters | Quản lý rạp |
| GET/POST | /api/v1/reviews | Đánh giá phim |
| GET/POST | /api/v1/coupons | Mã giảm giá |
| GET | /api/v1/reports | Báo cáo (admin) |
| GET/POST | /api/v1/seats | Quản lý ghế |
| GET | /api/v1/users | Quản lý user (admin) |

---

## 📡 Socket.io Events

### Client → Server
```javascript
socket.emit('join:showtime', showtimeId)
socket.emit('leave:showtime', showtimeId)
socket.emit('seat:select', { showtimeId, seatId })
socket.emit('seat:deselect', { showtimeId, seatId })
```

### Server → Client
```javascript
socket.on('seat:locked', ({ seatId, userId, showtimeId }) => {})
socket.on('seat:released', ({ seatId, showtimeId }) => {})
socket.on('seats:booked', ({ seatIds, showtimeId }) => {})
```

---

## 💺 Seat Locking Flow (Redis)

```
User chọn ghế A5
    ↓
Redis: SET seat_lock:showtimeId:A5  userId  EX 300  NX
    ↓
Nếu OK   → Ghế bị lock 5 phút → Socket broadcast "seat:locked"
Nếu FAIL → Ghế đã bị người khác giữ → Trả về lỗi

Thanh toán thành công:
    → Xóa Redis lock
    → Ghi vào MongoDB Showtime.bookedSeats
    → Socket broadcast "seats:booked"

Hết 5 phút không thanh toán:
    → Redis tự xóa (TTL expire)
    → Socket broadcast "seat:released"
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | TailwindCSS |
| 3D / Animation | Three.js (HeroScene, TiltCard) |
| State | Zustand (authStore, themeStore) |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB + Mongoose |
| Cache / Lock | Redis (ioredis) |
| Realtime | Socket.io |
| Auth | JWT (Access Token + Refresh Token) + OTP |
| Email / SMS | emailService + smsService |
| Payment | MoMo / VietQR / Chuyển khoản (Mock) |

---

## 🔧 Troubleshooting

**Lỗi kết nối MongoDB:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

**Lỗi Redis:**
```bash
redis-cli ping   # Kết quả mong đợi: PONG
```

**Port conflict:**
```bash
# Đổi PORT trong backend/.env
PORT=5001
```

**Frontend không gọi được API:**
```
# Kiểm tra frontend/.env
VITE_API_URL=http://localhost:5000/api

# Kiểm tra vite.config.ts proxy
proxy: { '/api': { target: 'http://localhost:5000' } }
```

---

## 📦 Build Production

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build
# Output: frontend/dist/ → deploy lên Nginx / Vercel
```

---

*Được xây dựng với Nguyễn Trần Như Ngọc🐨 – 2026*