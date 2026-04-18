"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const coupon_controller_1 = require("../controllers/coupon.controller");
const router = (0, express_1.Router)();
router.use(errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin', 'staff'));
// ─── Dashboard ────────────────────────────────────────────
router.get('/dashboard', async (_, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalUsers, totalMovies, totalBookings, payments, todayBookings] = await Promise.all([
            models_1.User.countDocuments(),
            models_1.Movie.countDocuments({ isActive: true }),
            models_1.Booking.countDocuments({ status: { $in: ['confirmed', 'checked_in'] } }),
            models_1.Payment.find({ status: 'success' }).lean(),
            models_1.Booking.countDocuments({ status: { $in: ['confirmed', 'checked_in'] }, createdAt: { $gte: today } }),
        ]);
        const revenue = payments.reduce((s, p) => s + p.amount, 0);
        const activeSTs = await models_1.Showtime.find({ isActive: true })
            .populate('room', 'totalSeats seats')
            .lean();
        const totalCapacity = activeSTs.reduce((s, st) => {
            // Ưu tiên seats.length (không tính aisle), rồi totalSeats, rồi fallback 0
            const seatsCount = st.room?.seats?.filter((s) => !s.isAisle)?.length
                || st.room?.totalSeats
                || 0;
            return s + seatsCount;
        }, 0);
        const totalBooked = activeSTs.reduce((s, st) => s + (st.bookedSeats?.length || 0), 0);
        const occupancyRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
        const recentBookings = await models_1.Booking.find()
            .populate({ path: 'showtime', populate: { path: 'movie', select: 'title poster' } })
            .populate('user', 'name email')
            .sort({ createdAt: -1 }).limit(10).lean();
        const paymentByMethod = await models_1.Payment.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);
        res.json({ success: true, data: { totalUsers, totalMovies, totalBookings, revenue, todayBookings, recentBookings, paymentByMethod, occupancyRate } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Users ────────────────────────────────────────────────
router.get('/users', async (req, res) => {
    const { page = 1, limit = 20, role } = req.query;
    const q = {};
    if (role)
        q.role = role;
    const users = await models_1.User.find(q).select('-password -refreshTokens')
        .skip((+page - 1) * +limit).limit(+limit).sort({ createdAt: -1 });
    const total = await models_1.User.countDocuments(q);
    res.json({ success: true, data: users, pagination: { page: +page, limit: +limit, total } });
});
router.patch('/users/:id/role', async (req, res) => {
    const user = await models_1.User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    res.json({ success: true, data: user });
});
// ─── Chi tiết user ──────────────────────────────────
router.get('/users/:id/detail', async (req, res) => {
    try {
        const user = await models_1.User.findById(req.params.id)
            .select('-password -refreshTokens').lean();
        if (!user)
            return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
        // Lấy loyalty (hạng thẻ, điểm)
        const loyalty = await models_1.Loyalty.findOne({ user: req.params.id }).lean();
        // Lấy lịch sử booking
        const bookings = await models_1.Booking.find({ user: req.params.id })
            .populate({
            path: 'showtime',
            populate: [
                { path: 'movie', select: 'title poster' },
                { path: 'room', select: 'name' },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        // Tổng chi tiêu từ payment thành công
        const payments = await models_1.Payment.find({
            user: req.params.id,
            status: 'success',
        }).lean();
        const totalSpent = payments.reduce((s, p) => s + p.amount, 0);
        res.json({
            success: true,
            data: { user, loyalty, bookings, totalSpent },
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Khoá / mở tài khoản ───────────────────────────
router.patch('/users/:id/status', async (req, res) => {
    try {
        const user = await models_1.User.findById(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
        if (user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Không thể khoá tài khoản Admin' });
        }
        const updated = await models_1.User.findByIdAndUpdate(req.params.id, { isActive: !user.isActive }, { new: true }).select('-password -refreshTokens');
        res.json({
            success: true,
            data: updated,
            message: updated.isActive ? 'Đã mở tài khoản' : 'Đã khoá tài khoản',
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Theaters CRUD ────────────────────────────────────────
router.get('/theaters', async (_req, res) => {
    try {
        const theaters = await models_1.Theater.find().sort({ city: 1, name: 1 }).lean();
        res.json({ success: true, data: theaters });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/theaters', async (req, res) => {
    try {
        const t = await models_1.Theater.create(req.body);
        res.status(201).json({ success: true, data: t });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.put('/theaters/:id', async (req, res) => {
    try {
        const t = await models_1.Theater.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: t });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/theaters/:id', async (req, res) => {
    try {
        await models_1.Theater.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Theater deactivated' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Rooms CRUD + Seat Designer ───────────────────────────
router.get('/rooms', async (req, res) => {
    try {
        const { theaterId } = req.query;
        const q = {};
        if (theaterId)
            q.theater = theaterId;
        const rooms = await models_1.Room.find(q).populate('theater', 'name city').lean();
        res.json({ success: true, data: rooms });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/rooms/:id', async (req, res) => {
    try {
        const room = await models_1.Room.findById(req.params.id).populate('theater', 'name city').lean();
        if (!room)
            return res.status(404).json({ success: false, message: 'Room not found' });
        res.json({ success: true, data: room });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/rooms', async (req, res) => {
    try {
        const { theater, name, type, seats, prices } = req.body;
        const totalSeats = (seats || []).filter((s) => !s.isAisle).length;
        const rows = [...new Set((seats || []).map((s) => s.row))].length;
        const cols = Math.max(...(seats || []).map((s) => s.number || 0), 0);
        const room = await models_1.Room.create({ theater, name, type: type || 'standard', seats, totalSeats, rows, cols, prices });
        res.status(201).json({ success: true, data: room });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.put('/rooms/:id', async (req, res) => {
    try {
        const { seats, name, type, prices } = req.body;
        const update = { name, type };
        if (prices)
            update.prices = prices;
        if (seats) {
            update.seats = seats;
            update.totalSeats = seats.filter((s) => !s.isAisle).length;
            update.rows = [...new Set(seats.map((s) => s.row))].length;
            update.cols = Math.max(...seats.map((s) => s.number || 0), 0);
        }
        const room = await models_1.Room.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json({ success: true, data: room });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/rooms/:id', async (req, res) => {
    try {
        await models_1.Room.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Room deactivated' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Showtimes CRUD ───────────────────────────────────────
router.post('/showtimes', async (req, res) => {
    try {
        const st = await models_1.Showtime.create(req.body);
        res.status(201).json({ success: true, data: st });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.put('/showtimes/:id', async (req, res) => {
    try {
        const st = await models_1.Showtime.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: st });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/showtimes/:id', async (req, res) => {
    try {
        await models_1.Showtime.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Showtime deactivated' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Smart Scheduling Algorithm (Round-Robin) ─────────────
router.post('/showtimes/auto-generate', async (req, res) => {
    try {
        const { movieIds, movieId, theaterId, roomId, startDate, endDate, priceStandard = 85000, priceVip = 130000, priceDouble = 200000, priceRecliner = 150000, timeSlots, } = req.body;
        const ids = movieIds?.length ? movieIds : movieId ? [movieId] : [];
        if (!ids.length)
            return res.status(400).json({ success: false, message: 'Cần ít nhất 1 phim' });
        const TIME_SLOTS_TO_USE = (timeSlots && timeSlots.length > 0) ? timeSlots : [8, 10, 13.5, 15, 17.5, 19.5, 21];
        const movies = await models_1.Movie.find({ _id: { $in: ids } }).lean();
        if (!movies.length)
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
        const roomQuery = { theater: theaterId, isActive: true };
        if (roomId)
            roomQuery._id = roomId;
        const rooms = await models_1.Room.find(roomQuery).lean();
        if (!rooms.length)
            return res.status(404).json({ success: false, message: 'No rooms found for this theater' });
        const GOLDEN_HOURS = [14, 17, 19, 21];
        const ACTION_GENRES = ['action', 'thriller', 'sci-fi', 'horror'];
        function scoreSlot(hour, weekday, movie) {
            const rating = movie.rating || 7;
            const genre = movie.genre || [];
            const isBlockbuster = rating >= 8 || genre.some((g) => ACTION_GENRES.includes(g.toLowerCase()));
            let score = 0;
            if (weekday === 5 || weekday === 6 || weekday === 0)
                score += 30;
            else if (weekday === 4)
                score += 15;
            else
                score += 5;
            if (hour >= 19 && hour <= 21)
                score += 40;
            else if (hour >= 14 && hour <= 17)
                score += 25;
            else if (hour >= 10 && hour <= 13)
                score += 10;
            else
                score += 5;
            if (GOLDEN_HOURS.includes(hour))
                score += 20;
            if (rating >= 8.5)
                score += 20;
            else if (rating >= 7.5)
                score += 10;
            if (isBlockbuster && (weekday === 5 || weekday === 6))
                score += 15;
            return score;
        }
        function hasOverlap(s1, e1, s2, e2) {
            return s1 < e2 && e1 > s2;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const sessionSlots = [];
        const generatedByMovie = {};
        ids.forEach(id => { generatedByMovie[id] = 0; });
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const weekday = d.getDay();
            const scoredSlots = TIME_SLOTS_TO_USE
                .map(h => ({ hour: h, score: scoreSlot(h, weekday, movies[0]) }))
                .sort((a, b) => b.score - a.score);
            const movieQueue = [...movies].sort((a, b) => (generatedByMovie[a._id.toString()] || 0) - (generatedByMovie[b._id.toString()] || 0));
            for (let slotIdx = 0; slotIdx < scoredSlots.length; slotIdx++) {
                const { hour } = scoredSlots[slotIdx];
                const movie = movieQueue[slotIdx % movieQueue.length];
                const duration = movie.duration || 120;
                const mId = movie._id.toString();
                const startTime = new Date(d);
                startTime.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
                const endTime = new Date(startTime.getTime() + (duration + 15) * 60000);
                for (const room of rooms) {
                    const dbConflict = await models_1.Showtime.findOne({
                        room: room._id, isActive: true,
                        startTime: { $lt: endTime }, endTime: { $gt: startTime },
                    });
                    if (dbConflict)
                        continue;
                    const sessionConflict = sessionSlots.some(slot => slot.roomId === room._id.toString() &&
                        hasOverlap(startTime, endTime, slot.startTime, slot.endTime));
                    if (sessionConflict)
                        continue;
                    await models_1.Showtime.create({
                        movie: mId, room: room._id, theater: theaterId,
                        startTime, endTime,
                        priceStandard, priceVip, priceDouble, priceRecliner,
                        basePrice: priceStandard, isActive: true,
                    });
                    sessionSlots.push({ roomId: room._id.toString(), startTime, endTime });
                    generatedByMovie[mId]++;
                    break;
                }
            }
        }
        const totalGenerated = Object.values(generatedByMovie).reduce((s, v) => s + v, 0);
        const breakdown = movies.map(m => ({
            title: m.title,
            generated: generatedByMovie[m._id.toString()] || 0,
        }));
        res.json({
            success: true,
            message: `✅ Tạo ${totalGenerated} suất chiếu cho ${movies.length} phim!`,
            data: { generated: totalGenerated, algorithm: 'round-robin + 5-factor scoring', breakdown },
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Invoices (Hóa đơn) ───────────────────────────────────
router.get('/invoices', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, method } = req.query;
        const q = {};
        if (status)
            q.status = status;
        if (method)
            q.method = method;
        // Tìm kiếm theo mã vé, tên khách, email
        if (search) {
            const users = await models_1.User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ]
            }).select('_id').lean();
            const userIds = users.map((u) => u._id);
            const bookings = await models_1.Booking.find({
                bookingCode: { $regex: search, $options: 'i' }
            }).select('_id').lean();
            const bookingIds = bookings.map((b) => b._id);
            q.$or = [
                { user: { $in: userIds } },
                { booking: { $in: bookingIds } },
                { transactionId: { $regex: search, $options: 'i' } },
            ];
        }
        const [payments, total] = await Promise.all([
            models_1.Payment.find(q)
                .populate('user', 'name email phone')
                .populate('soldBy', 'name email')
                .populate({
                path: 'booking',
                select: 'bookingCode seatLabels totalAmount',
                populate: {
                    path: 'showtime',
                    select: 'startTime',
                    populate: { path: 'movie', select: 'title poster' },
                },
            })
                .sort({ createdAt: -1 })
                .skip((+page - 1) * +limit)
                .limit(+limit)
                .lean(),
            models_1.Payment.countDocuments(q),
        ]);
        res.json({
            success: true,
            data: payments,
            pagination: { page: +page, limit: +limit, total },
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Đổi trạng thái hóa đơn (chỉ Admin) ──────────────────
router.patch('/invoices/:id/status', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Chỉ Admin được thay đổi trạng thái hóa đơn' });
        }
        const { status } = req.body;
        const VALID = ['success', 'failed', 'refunded', 'pending_confirmation', 'pending'];
        if (!VALID.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }
        const payment = await models_1.Payment.findByIdAndUpdate(req.params.id, { status, ...(status === 'success' ? { paidAt: new Date() } : {}) }, { new: true });
        if (!payment)
            return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
        // Đồng bộ trạng thái booking
        if (status === 'success') {
            await models_1.Booking.findByIdAndUpdate(payment.booking, { status: 'confirmed', paymentId: payment._id });
        }
        else if (status === 'failed' || status === 'refunded') {
            await models_1.Booking.findByIdAndUpdate(payment.booking, { status: 'pending' });
        }
        res.json({ success: true, data: payment, message: 'Đã cập nhật trạng thái' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ─── Coupons ──────────────────────────────────────────────
router.get('/coupons', coupon_controller_1.getCoupons);
router.post('/coupons', coupon_controller_1.createCoupon);
router.delete('/coupons/:id', coupon_controller_1.deleteCoupon);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map