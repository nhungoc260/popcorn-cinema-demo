import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'customer' | 'staff' | 'admin';
    avatar?: string;
    isVerified: boolean;
    isActive: boolean;
    googleId?: string | null;
    refreshTokens: string[];
    birthday?: Date;
    gender?: string;
    createdAt: Date;
    comparePassword(pwd: string): Promise<boolean>;
}
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
    cast: {
        name: string;
        role: string;
        avatar?: string;
    }[];
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
export interface ITheater extends Document {
    name: string;
    address: string;
    city: string;
    phone: string;
    isActive: boolean;
}
export interface IRoom extends Document {
    theater: mongoose.Types.ObjectId;
    name: string;
    type: 'standard' | '4dx' | 'imax' | 'vip' | 'couple';
    rows: number;
    cols: number;
    totalSeats: number;
    seats: {
        row: string;
        number: number;
        type: string;
        isAisle: boolean;
    }[];
    prices?: {
        standard: number;
        vip: number;
        couple: number;
        recliner: number;
    };
    isActive: boolean;
}
export interface ISeat extends Document {
    room: mongoose.Types.ObjectId;
    row: string;
    col: number;
    label: string;
    type: 'standard' | 'vip' | 'couple' | 'disabled';
    isActive: boolean;
    price: number;
}
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
export interface IBooking extends Document {
    user: mongoose.Types.ObjectId;
    soldBy?: mongoose.Types.ObjectId;
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
    paidAmount?: number;
}
export interface IPayment extends Document {
    booking: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    soldBy?: mongoose.Types.ObjectId;
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
export interface IOTP extends Document {
    email: string;
    otp: string;
    expiresAt: Date;
    used: boolean;
}
export interface IReview extends Document {
    user: mongoose.Types.ObjectId;
    movie: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    likes: number;
    createdAt: Date;
}
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
    eligibleTiers: ('bronze' | 'silver' | 'gold' | 'platinum')[];
}
export interface ILoyalty extends Document {
    user: mongoose.Types.ObjectId;
    points: number;
    totalEarned: number;
    totalSpent: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    history: {
        action: string;
        points: number;
        date: Date;
        ref?: string;
    }[];
}
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
export interface ISupportTicket extends Document {
    ticketId: string;
    userId?: mongoose.Types.ObjectId;
    userName: string;
    userEmail: string;
    message: string;
    category: string;
    status: 'pending' | 'in_progress' | 'resolved';
    note: string;
    resolvedAt?: Date;
    createdAt: Date;
}
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
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Movie: mongoose.Model<IMovie, {}, {}, {}, mongoose.Document<unknown, {}, IMovie, {}, {}> & IMovie & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Theater: mongoose.Model<ITheater, {}, {}, {}, mongoose.Document<unknown, {}, ITheater, {}, {}> & ITheater & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Room: mongoose.Model<IRoom, {}, {}, {}, mongoose.Document<unknown, {}, IRoom, {}, {}> & IRoom & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Seat: mongoose.Model<ISeat, {}, {}, {}, mongoose.Document<unknown, {}, ISeat, {}, {}> & ISeat & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Showtime: mongoose.Model<IShowtime, {}, {}, {}, mongoose.Document<unknown, {}, IShowtime, {}, {}> & IShowtime & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Booking: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Payment: mongoose.Model<IPayment, {}, {}, {}, mongoose.Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const OTP: mongoose.Model<IOTP, {}, {}, {}, mongoose.Document<unknown, {}, IOTP, {}, {}> & IOTP & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Review: mongoose.Model<IReview, {}, {}, {}, mongoose.Document<unknown, {}, IReview, {}, {}> & IReview & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Coupon: mongoose.Model<ICoupon, {}, {}, {}, mongoose.Document<unknown, {}, ICoupon, {}, {}> & ICoupon & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Loyalty: mongoose.Model<ILoyalty, {}, {}, {}, mongoose.Document<unknown, {}, ILoyalty, {}, {}> & ILoyalty & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Ticket: mongoose.Model<ITicket, {}, {}, {}, mongoose.Document<unknown, {}, ITicket, {}, {}> & ITicket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const SupportTicket: mongoose.Model<ISupportTicket, {}, {}, {}, mongoose.Document<unknown, {}, ISupportTicket, {}, {}> & ISupportTicket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Promotion: mongoose.Model<IPromotion, {}, {}, {}, mongoose.Document<unknown, {}, IPromotion, {}, {}> & IPromotion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=index.d.ts.map