# 🎬 Popcorn Cinema – Hệ Thống Đặt Vé Xem Phim Trực Tuyến

> **Production-ready** cinema booking system với UI Dark Cinematic 2026, 3D effects, Realtime seat locking, và tích hợp thanh toán Việt Nam.

---

## 🗂 Cấu Trúc Dự Án

```
popcorn-cinema/
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/          # DB (MongoDB) + Redis
│   │   ├── controllers/     # Auth, Booking, Payment
│   │   ├── middleware/      # JWT auth, error handler
│   │   ├── models/          # Mongoose schemas (8 models)
│   │   ├── routes/          # REST API routes
│   │   ├── socket/          # Socket.io server
│   │   └── utils/           # Seed script
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/             # Axios client + all API calls
│   │   ├── components/
│   │   │   ├── 3d/          # Three.js Hero + TiltCard
│   │   │   ├── booking/     # SeatGrid, BookingSteps
│   │   │   ├── layout/      # Navbar, Footer
│   │   │   ├── movie/       # MovieCard
│   │   │   └── ui/          # Skeletons
│   │   ├── hooks/           # useSocket (realtime)
│   │   ├── pages/
│   │   │   ├── admin/       # Dashboard, Movies, Showtimes, Users
│   │   │   ├── staff/       # CheckIn QR
│   │   │   └── *.tsx        # Customer pages
│   │   ├── store/           # Zustand (auth, theme)
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
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

### Bước 1 – Tạo thư mục (Windows PowerShell)

```powershell
# Chạy script setup
cd "D:\Bai Tap"
.\setup_popcorn_cinema.ps1
```

### Bước 2 – Copy source code

Đặt thư mục `backend/` và `frontend/` vào `D:\Bai Tap\popcorn-cinema\`

### Bước 3 – Khởi động MongoDB & Redis

```bash
# MongoDB (Windows Service – thường đã auto start)
net start MongoDB

# Redis (Windows)
# Download từ https://github.com/microsoftarchive/redis/releases
redis-server

# macOS/Linux
brew services start mongodb-community
brew services start redis
```

### Bước 4 – Setup Backend

```bash
cd "D:\Bai Tap\popcorn-cinema\backend"
npm install
cp .env .env.local  # Kiểm tra config
npm run seed        # Seed database với dữ liệu mẫu
npm run dev         # Chạy backend (port 5000)
```

### Bước 5 – Setup Frontend

```bash
cd "D:\Bai Tap\popcorn-cinema\frontend"
npm install
npm run dev         # Chạy frontend (port 5173)
```

### Bước 6 – Mở trình duyệt

```
🌐 Frontend: http://localhost:5173
📡 Backend:  http://localhost:5000
🏥 Health:   http://localhost:5000/health
```

---

## 👤 Tài Khoản Demo

| Role | Email | Password |
|------|-------|----------|
| 👤 Customer | user@popcorn.vn | user123 |
| 🎬 Staff | staff@popcorn.vn | staff123 |
| 🔑 Admin | admin@popcorn.vn | admin123 |

---

## 🗺 Luồng Đặt Vé

```
[Trang Chủ] → Chọn Phim → Chọn Suất Chiếu
     → [Chọn Ghế] → Lock ghế (Redis 5 phút)
     → [Thanh Toán] → MoMo / VietQR / Bank
     → [Xác Nhận] → Vé QR Code
     → [Check-in Staff] → Quét mã → Vào rạp ✅
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
| GET  | /api/v1/auth/me | Thông tin user |
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
| GET | /api/v1/showtimes/:id | Chi tiết suất |
| GET | /api/v1/showtimes/:id/seats | Trạng thái ghế |

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
| POST | /api/v1/payments/confirm | Xác nhận đã TT (mock) |
| GET | /api/v1/payments/:id | Chi tiết payment |

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
Redis: SET seat_lock:showtimeId:A5_id  userId  EX 300  NX
    ↓ (NX = only if Not eXists)
Nếu OK  → Ghế bị lock 5 phút → Socket broadcast "seat:locked"
Nếu FAIL → Ghế đã bị người khác giữ → Trả lỗi

Thanh toán thành công:
    → Xóa Redis lock
    → Ghi vào MongoDB Showtime.bookedSeats (permanent)
    → Socket broadcast "seats:booked"

Hết 5 phút (không TT):
    → Redis tự xóa (TTL expire)
    → Socket broadcast "seat:released" (qua polling hoặc pub/sub)
```

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | #0F172A |
| Primary (Cyan) | #22D3EE |
| Secondary | #67E8F9 |
| Accent (Gold) | #FDE68A |
| Glass | rgba(255,255,255,0.06) |

**Cute Mode** (toggle 🌸):
| Token | Value |
|-------|-------|
| Background | #FFF7ED |
| Primary | #FFB3C1 |
| Secondary | #BDE0FE |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | TailwindCSS + Custom CSS Variables |
| Animation | Framer Motion |
| 3D | React Three Fiber + Three.js |
| State | Zustand + React Query |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB + Mongoose |
| Cache/Lock | Redis (ioredis) |
| Realtime | Socket.io |
| Auth | JWT (Access 15m + Refresh 7d) |
| Payment | MoMo / VietQR / Bank (Mock) |

---

## 🔧 Troubleshooting

**Lỗi kết nối MongoDB:**
```bash
# Kiểm tra service
mongosh --eval "db.adminCommand('ping')"
```

**Lỗi Redis:**
```bash
redis-cli ping  # Kết quả: PONG
```

**Port conflict:**
```bash
# Đổi PORT trong backend/.env
PORT=5001
```

**Frontend không gọi được API:**
```
# Kiểm tra vite.config.ts proxy target
proxy: { '/api': { target: 'http://localhost:5000' } }
```

---

## 📦 Build Production

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build
# Output: frontend/dist/ → deploy lên Nginx/Vercel
```

---

*Được xây dựng với ❤️ bởi Popcorn Cinema Team – 2026*
