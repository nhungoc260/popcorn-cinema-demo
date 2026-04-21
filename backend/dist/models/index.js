"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Promotion = exports.SupportTicket = exports.Ticket = exports.Loyalty = exports.Coupon = exports.Review = exports.OTP = exports.Payment = exports.Booking = exports.Showtime = exports.Seat = exports.Room = exports.Theater = exports.Movie = exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.Schema({
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
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    next();
});
UserSchema.methods.comparePassword = async function (pwd) {
    return bcryptjs_1.default.compare(pwd, this.password);
};
const MovieSchema = new mongoose_1.Schema({
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
const TheaterSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
const SeatDefinitionSchema = new mongoose_1.Schema({
    row: { type: String, required: true },
    number: { type: Number, required: true },
    type: { type: String, enum: ['standard', 'vip', 'couple', 'aisle', 'recliner'], default: 'standard' },
    isAisle: { type: Boolean, default: false },
}, { _id: true });
const RoomSchema = new mongoose_1.Schema({
    theater: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Theater', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['standard', '4dx', 'imax', 'vip', 'couple'], default: 'standard' },
    rows: { type: Number, default: 0 },
    cols: { type: Number, default: 0 },
    totalSeats: { type: Number, default: 0 },
    seats: { type: [SeatDefinitionSchema], default: [] },
    prices: {
        type: new mongoose_1.Schema({
            standard: { type: Number, default: 85000 },
            vip: { type: Number, default: 110000 },
            couple: { type: Number, default: 180000 },
            recliner: { type: Number, default: 150000 },
        }, { _id: false }),
        default: () => ({ standard: 85000, vip: 110000, couple: 180000, recliner: 150000 }),
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
const SeatSchema = new mongoose_1.Schema({
    room: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Room', required: true },
    row: { type: String, required: true },
    col: { type: Number, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['standard', 'vip', 'couple', 'disabled'], default: 'standard' },
    isActive: { type: Boolean, default: true },
    price: { type: Number, default: 80000 },
}, { timestamps: true });
const ShowtimeSchema = new mongoose_1.Schema({
    movie: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Movie', required: true },
    room: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Room', required: true },
    theater: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Theater', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    language: { type: String, enum: ['sub', 'dub', 'original'], default: 'sub' },
    format: { type: String, enum: ['2D', '3D', '4DX', 'IMAX'], default: '2D' },
    basePrice: { type: Number, default: 80000 },
    bookedSeats: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Seat' }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
const BookingSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    soldBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null }, // nhân viên bán tại quầy
    showtime: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Seat' }],
    seatLabels: [String],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'pending_payment', 'confirmed', 'cancelled', 'checked_in'], default: 'pending' },
    qrCode: String,
    bookingCode: { type: String, unique: true },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment' },
    expiresAt: { type: Date, required: true },
    checkedInAt: Date,
    checkedInBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    paidAmount: { type: Number, default: 0 }, // số tiền thực tế sau giảm giá
}, { timestamps: true });
const PaymentSchema = new mongoose_1.Schema({
    booking: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    soldBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null }, // nhân viên bán tại quầy
    amount: { type: Number, required: true },
    originalAmount: { type: Number, default: 0 },
    pointsUsed: { type: Number, default: 0 }, // giá gốc trước giảm giá
    couponCode: { type: String, default: null }, // mã giảm giá áp dụng
    confirmedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    method: { type: String, enum: ['momo', 'vietqr', 'bank', 'cash'], required: true },
    status: { type: String, enum: ['pending', 'pending_confirmation', 'customer_confirmed', 'success', 'failed', 'refunded'], default: 'pending' },
    transactionId: { type: String, unique: true },
    qrData: String,
    paidAt: Date,
    rejectReason: { type: String, default: null },
    metadata: mongoose_1.Schema.Types.Mixed,
}, { timestamps: true });
const OTPSchema = new mongoose_1.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    used: { type: Boolean, default: false },
}, { timestamps: true });
const ReviewSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Movie', required: true },
    rating: { type: Number, required: true, min: 1, max: 10 },
    comment: { type: String, default: '' },
    likes: { type: Number, default: 0 },
}, { timestamps: true });
ReviewSchema.index({ user: 1, movie: 1 }, { unique: true });
const CouponSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 999999 },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });
const LoyaltySchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    points: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    history: [{ action: String, points: Number, date: { type: Date, default: Date.now }, ref: String }],
}, { timestamps: true });
const TicketSchema = new mongoose_1.Schema({
    booking: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    showtime: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seat: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Seat', required: true },
    seatLabel: { type: String, required: true },
    bookingCode: { type: String, required: true, index: true },
    qrCode: { type: String, default: '' },
    status: { type: String, enum: ['valid', 'used', 'cancelled', 'refunded'], default: 'valid' },
    issuedAt: { type: Date, default: Date.now },
    usedAt: { type: Date },
    paidAmount: { type: Number, default: 0 },
}, { timestamps: true });
TicketSchema.index({ bookingCode: 1 });
TicketSchema.index({ user: 1, createdAt: -1 });
const SupportTicketSchema = new mongoose_1.Schema({
    ticketId: { type: String, required: true, unique: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: 'Khách vãng lai' },
    userEmail: { type: String, default: '' },
    message: { type: String, required: true },
    category: { type: String, default: 'general' },
    status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
    note: { type: String, default: '' },
    resolvedAt: Date,
}, { timestamps: true });
const PromotionSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    tag: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    gradient: { type: String, default: 'linear-gradient(135deg, #4C1D95, #7C3AED)' },
    color: { type: String, default: '#A855F7' },
    conditions: [String],
    target: { type: String, default: 'Tất cả khách hàng' },
    validFrom: { type: String, default: '' },
    validTo: { type: String, default: '' },
    couponCode: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
// ── Exports ────────────────────────────────────────────────
exports.User = mongoose_1.default.model('User', UserSchema);
exports.Movie = mongoose_1.default.model('Movie', MovieSchema);
exports.Theater = mongoose_1.default.model('Theater', TheaterSchema);
exports.Room = mongoose_1.default.model('Room', RoomSchema);
exports.Seat = mongoose_1.default.model('Seat', SeatSchema);
exports.Showtime = mongoose_1.default.model('Showtime', ShowtimeSchema);
exports.Booking = mongoose_1.default.model('Booking', BookingSchema);
exports.Payment = mongoose_1.default.model('Payment', PaymentSchema);
exports.OTP = mongoose_1.default.model('OTP', OTPSchema);
exports.Review = mongoose_1.default.model('Review', ReviewSchema);
exports.Coupon = mongoose_1.default.model('Coupon', CouponSchema);
exports.Loyalty = mongoose_1.default.model('Loyalty', LoyaltySchema);
exports.Ticket = mongoose_1.default.model('Ticket', TicketSchema);
exports.SupportTicket = mongoose_1.default.model('SupportTicket', SupportTicketSchema);
exports.Promotion = mongoose_1.default.model('Promotion', PromotionSchema);
//# sourceMappingURL=index.js.map