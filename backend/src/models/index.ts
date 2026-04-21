import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// ════════════════════════════════════════════════════════
// USER MODEL
// ════════════════════════════════════════════════════════
export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'staff' | 'admin';
  avatar?: string;
  isVerified: boolean;
  isActive: boolean; // [MỚI] khoá/mở tài khoản
  googleId?: string | null;
  refreshTokens: string[];
  birthday?: Date;
  gender?: string;
  createdAt: Date;
  comparePassword(pwd: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
  avatar: String,
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }, // [MỚI]
  googleId: { type: String, default: null },
  refreshTokens: [String],
  birthday: { type: Date, default: null },
  gender: { type: String, default: '' },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
UserSchema.methods.comparePassword = async function (pwd: string) {
  return bcrypt.compare(pwd, this.password);
};

// ════════════════════════════════════════════════════════
// MOVIE MODEL
// ════════════════════════════════════════════════════════
export interface IMovie extends Document {
  title: string;
  titleEn: string;
  description: string;
  poster: string;
  backdrop: string;
  trailer: string;
  duration: number;
  genres: string[];
  rating: number;
  ratingCount: number;
  cast: { name: string; role: string; avatar?: string }[];
  director: string;
  releaseDate: Date;
  status: 'coming_soon' | 'now_showing' | 'ended' | 'suspended';
  language: string;
  ageRating: string;
  country: string;
  subtitle: 'vietsub' | 'dubbed' | 'original';
  note: string;
  isActive: boolean;
}

const MovieSchema = new Schema<IMovie>({
  title: { type: String, required: true },
  titleEn: { type: String, default: '' },
  description: { type: String, required: true },
  poster: { type: String, required: true },
  backdrop: { type: String, default: '' },
  trailer: { type: String, default: '' },
  duration: { type: Number, required: true },
  genres: [String],
  rating: { type: Number, default: 0, min: 0, max: 10 },
  ratingCount: { type: Number, default: 0 },
  cast: [{ name: String, role: String, avatar: String }],
  director: String,
  releaseDate: Date,
  status: { type: String, enum: ['coming_soon', 'now_showing', 'ended', 'suspended'], default: 'coming_soon' },
  language: { type: String, default: 'Tiếng Việt' },
  ageRating: { type: String, default: 'P' },
  country: { type: String, default: '' },
  subtitle: { type: String, enum: ['vietsub', 'dubbed', 'original'], default: 'vietsub' },
  note: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// THEATER MODEL
// ════════════════════════════════════════════════════════
export interface ITheater extends Document {
  name: string;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
}

const TheaterSchema = new Schema<ITheater>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  phone: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// ROOM MODEL
// ════════════════════════════════════════════════════════
export interface IRoom extends Document {
  theater: mongoose.Types.ObjectId;
  name: string;
  type: 'standard' | '4dx' | 'imax' | 'vip' | 'couple';
  rows: number;
  cols: number;
  totalSeats: number;
  seats: { row: string; number: number; type: string; isAisle: boolean }[];
  prices?: { standard: number; vip: number; couple: number; recliner: number };
  isActive: boolean;
}

const SeatDefinitionSchema = new Schema({
  row: { type: String, required: true },
  number: { type: Number, required: true },
  type: { type: String, enum: ['standard', 'vip', 'couple', 'aisle', 'recliner'], default: 'standard' },
  isAisle: { type: Boolean, default: false },
}, { _id: true });

const RoomSchema = new Schema<IRoom>({
  theater: { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['standard', '4dx', 'imax', 'vip', 'couple'], default: 'standard' },
  rows: { type: Number, default: 0 },
  cols: { type: Number, default: 0 },
  totalSeats: { type: Number, default: 0 },
  seats: { type: [SeatDefinitionSchema], default: [] },
  prices: {
    type: new Schema({
      standard: { type: Number, default: 85000 },
      vip:      { type: Number, default: 110000 },
      couple:   { type: Number, default: 180000 },
      recliner: { type: Number, default: 150000 },
    }, { _id: false }),
    default: () => ({ standard: 85000, vip: 110000, couple: 180000, recliner: 150000 }),
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// SEAT MODEL
// ════════════════════════════════════════════════════════
export interface ISeat extends Document {
  room: mongoose.Types.ObjectId;
  row: string;
  col: number;
  label: string;
  type: 'standard' | 'vip' | 'couple' | 'disabled';
  isActive: boolean;
  price: number;
}

const SeatSchema = new Schema<ISeat>({
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  row: { type: String, required: true },
  col: { type: Number, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['standard', 'vip', 'couple', 'disabled'], default: 'standard' },
  isActive: { type: Boolean, default: true },
  price: { type: Number, default: 80000 },
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// SHOWTIME MODEL
// ════════════════════════════════════════════════════════
export interface IShowtime extends Document {
  movie: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  theater: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  language: 'sub' | 'dub' | 'original';
  format: '2D' | '3D' | '4DX' | 'IMAX';
  basePrice: number;
  bookedSeats: mongoose.Types.ObjectId[];
  isActive: boolean;
}

const ShowtimeSchema = new Schema<IShowtime>({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  theater: { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  language: { type: String, enum: ['sub', 'dub', 'original'], default: 'sub' },
  format: { type: String, enum: ['2D', '3D', '4DX', 'IMAX'], default: '2D' },
  basePrice: { type: Number, default: 80000 },
  bookedSeats: [{ type: Schema.Types.ObjectId, ref: 'Seat' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// BOOKING MODEL
// ════════════════════════════════════════════════════════
export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  soldBy?: mongoose.Types.ObjectId; // nhân viên bán tại quầy (nếu có)
  showtime: mongoose.Types.ObjectId;
  seats: mongoose.Types.ObjectId[];
  seatLabels: string[];
  totalAmount: number;
  status: 'pending' | 'pending_payment' | 'confirmed' | 'cancelled' | 'checked_in';
  qrCode: string;
  bookingCode: string;
  paymentId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  checkedInAt?: Date;
  checkedInBy?: mongoose.Types.ObjectId;
  paidAmount?: number; // số tiền thực tế sau giảm giá
}

const BookingSchema = new Schema<IBooking>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  soldBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // nhân viên bán tại quầy
  showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seats: [{ type: Schema.Types.ObjectId, ref: 'Seat' }],
  seatLabels: [String],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'pending_payment', 'confirmed', 'cancelled', 'checked_in'], default: 'pending' },
  qrCode: String,
  bookingCode: { type: String, unique: true },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  expiresAt: { type: Date, required: true },
  checkedInAt: Date,
  checkedInBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paidAmount: { type: Number, default: 0 }, // số tiền thực tế sau giảm giá
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// PAYMENT MODEL
// ════════════════════════════════════════════════════════
export interface IPayment extends Document {
  booking: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  soldBy?: mongoose.Types.ObjectId; // nhân viên bán tại quầy (nếu có)
  amount: number;
  originalAmount?: number;
  pointsUsed?: number;
  couponCode?: string; 
  confirmedBy?: mongoose.Types.ObjectId;
  method: 'momo' | 'vietqr' | 'bank' | 'cash';
  status: 'pending' | 'pending_confirmation' | 'customer_confirmed' | 'success' | 'failed' | 'refunded';
  transactionId: string;
  qrData?: string;
  paidAt?: Date;
  rejectReason?: string;
  metadata?: Record<string, unknown>;
}

const PaymentSchema = new Schema<IPayment>({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  soldBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // nhân viên bán tại quầy
  amount: { type: Number, required: true },
  originalAmount: { type: Number, default: 0 },
  pointsUsed: { type: Number, default: 0 }, // giá gốc trước giảm giá
  couponCode:  { type: String, default: null }, // mã giảm giá áp dụng
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  method: { type: String, enum: ['momo', 'vietqr', 'bank', 'cash'], required: true },
  status: { type: String, enum: ['pending', 'pending_confirmation', 'customer_confirmed', 'success', 'failed', 'refunded'], default: 'pending' },
  transactionId: { type: String, unique: true },
  qrData: String,
  paidAt: Date,
  rejectReason: { type: String, default: null },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// OTP MODEL
// ════════════════════════════════════════════════════════
export interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  used: boolean;
}
const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  used: { type: Boolean, default: false },
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// REVIEW MODEL
// ════════════════════════════════════════════════════════
export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  movie: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  likes: number;
  createdAt: Date;
}
const ReviewSchema = new Schema<IReview>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  rating: { type: Number, required: true, min: 1, max: 10 },
  comment: { type: String, default: '' },
  likes: { type: Number, default: 0 },
}, { timestamps: true });
ReviewSchema.index({ user: 1, movie: 1 }, { unique: true });

// ════════════════════════════════════════════════════════
// COUPON MODEL
// ════════════════════════════════════════════════════════
export interface ICoupon extends Document {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
  expiresAt: Date;
  isActive: boolean;
  usedBy: mongoose.Types.ObjectId[];
}
const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 999999 },
  usageLimit: { type: Number, default: 100 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// LOYALTY POINTS MODEL
// ════════════════════════════════════════════════════════
export interface ILoyalty extends Document {
  user: mongoose.Types.ObjectId;
  points: number;
  totalEarned: number;
  totalSpent: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  history: { action: string; points: number; date: Date; ref?: string }[];
}
const LoyaltySchema = new Schema<ILoyalty>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  points: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  history: [{ action: String, points: Number, date: { type: Date, default: Date.now }, ref: String }],
}, { timestamps: true });

// ════════════════════════════════════════════════════════
// TICKET MODEL
// ════════════════════════════════════════════════════════
export interface ITicket extends Document {
  booking: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  showtime: mongoose.Types.ObjectId;
  seat: mongoose.Types.ObjectId;
  seatLabel: string;
  bookingCode: string;
  qrCode: string;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  issuedAt: Date;
  usedAt?: Date;
  paidAmount: number;
}

const TicketSchema = new Schema<ITicket>({
  booking:     { type: Schema.Types.ObjectId, ref: 'Booking',  required: true },
  user:        { type: Schema.Types.ObjectId, ref: 'User',     required: true },
  showtime:    { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seat:        { type: Schema.Types.ObjectId, ref: 'Seat',     required: true },
  seatLabel:   { type: String, required: true },
  bookingCode: { type: String, required: true, index: true },
  qrCode:      { type: String, default: '' },
  status:      { type: String, enum: ['valid', 'used', 'cancelled', 'refunded'], default: 'valid' },
  issuedAt:    { type: Date, default: Date.now },
  usedAt:      { type: Date },
  paidAmount:  { type: Number, default: 0 },
}, { timestamps: true });

TicketSchema.index({ bookingCode: 1 });
TicketSchema.index({ user: 1, createdAt: -1 });

export interface ISupportTicket extends Document {
  ticketId: string
  userId?: mongoose.Types.ObjectId
  userName: string
  userEmail: string
  message: string
  category: string
  status: 'pending' | 'in_progress' | 'resolved'
  note: string
  resolvedAt?: Date
  createdAt: Date
}

const SupportTicketSchema = new Schema<ISupportTicket>({
  ticketId:  { type: String, required: true, unique: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  userName:  { type: String, default: 'Khách vãng lai' },
  userEmail: { type: String, default: '' },
  message:   { type: String, required: true },
  category:  { type: String, default: 'general' },
  status:    { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  note:      { type: String, default: '' },
  resolvedAt: Date,
}, { timestamps: true })

// ════════════════════════════════════════════════════════
// PROMOTION MODEL (ưu đãi tĩnh - admin quản lý)
// ════════════════════════════════════════════════════════
export interface IPromotion extends Document {
  title: string;
  description: string;
  tag: string;
  imageUrl?: string;
  gradient?: string;
  color?: string;
  conditions: string[];
  target: string;
  validFrom: string;
  validTo: string;
  couponCode?: string;
  isActive: boolean;
}

const PromotionSchema = new Schema<IPromotion>({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  tag:         { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  gradient:    { type: String, default: 'linear-gradient(135deg, #4C1D95, #7C3AED)' },
  color:       { type: String, default: '#A855F7' },
  conditions:  [String],
  target:      { type: String, default: 'Tất cả khách hàng' },
  validFrom:   { type: String, default: '' },
  validTo:     { type: String, default: '' },
  couponCode:  { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// ── Exports ────────────────────────────────────────────────
export const User     = mongoose.model<IUser>('User', UserSchema);
export const Movie    = mongoose.model<IMovie>('Movie', MovieSchema);
export const Theater  = mongoose.model<ITheater>('Theater', TheaterSchema);
export const Room     = mongoose.model<IRoom>('Room', RoomSchema);
export const Seat     = mongoose.model<ISeat>('Seat', SeatSchema);
export const Showtime = mongoose.model<IShowtime>('Showtime', ShowtimeSchema);
export const Booking  = mongoose.model<IBooking>('Booking', BookingSchema);
export const Payment  = mongoose.model<IPayment>('Payment', PaymentSchema);
export const OTP      = mongoose.model<IOTP>('OTP', OTPSchema);
export const Review   = mongoose.model<IReview>('Review', ReviewSchema);
export const Coupon   = mongoose.model<ICoupon>('Coupon', CouponSchema);
export const Loyalty  = mongoose.model<ILoyalty>('Loyalty', LoyaltySchema);
export const Ticket   = mongoose.model<ITicket>('Ticket', TicketSchema);
export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema)
export const Promotion = mongoose.model<IPromotion>('Promotion', PromotionSchema);
