import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initSocket } from './socket/socketServer';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import movieRoutes from './routes/movie.routes';
import theaterRoutes from './routes/theater.routes';
import showtimeRoutes from './routes/showtime.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import seatRoutes from './routes/seat.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import reviewRoutes from './routes/review.routes';
import couponRoutes from './routes/coupon.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';

const app = express();
const server = http.createServer(app);

app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/movies`, movieRoutes);
app.use(`${API}/theaters`, theaterRoutes);
app.use(`${API}/showtimes`, showtimeRoutes);
app.use(`${API}/bookings`, bookingRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/seats`, seatRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/users`, userRoutes);

app.use(`${API}/movies/:movieId/reviews`, reviewRoutes);
app.use(`${API}/coupons`, couponRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/ai`, aiRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.get('*', (_, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();   // không throw dù Redis offline
    initSocket(server);
    server.listen(PORT, () => {
      console.log(`\n Popcorn Cinema API  →  http://localhost:${PORT}`);
      console.log(`📡 WebSocket ready`);
      console.log(`🏥 Health check      →  http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
export { server };
