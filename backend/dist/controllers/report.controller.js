"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueReport = getRevenueReport;
exports.getOccupancyReport = getOccupancyReport;
exports.getUserBehavior = getUserBehavior;
exports.getUserTrends = getUserTrends;
const models_1 = require("../models");
// GET /admin/reports/revenue?period=day|week|month|year
async function getRevenueReport(req, res) {
    try {
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate;
        let groupFormat;
        if (period === 'day') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
            groupFormat = '%Y-%m-%d';
        }
        else if (period === 'week') {
            startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
            groupFormat = '%Y-%U';
        }
        else if (period === 'year') {
            startDate = new Date(now.getFullYear() - 2, 0, 1);
            groupFormat = '%Y-%m';
        }
        else {
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            groupFormat = '%Y-%m';
        }
        const revenue = await models_1.Payment.aggregate([
            { $match: { status: 'success', createdAt: { $gte: startDate } } },
            { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt', timezone: '+07:00' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const topMovies = await models_1.Booking.aggregate([
            { $match: { status: 'confirmed', createdAt: { $gte: startDate } } },
            { $group: { _id: '$showtime', totalSeats: { $sum: { $size: '$seats' } }, revenue: { $sum: '$totalAmount' } } },
            { $lookup: { from: 'showtimes', localField: '_id', foreignField: '_id', as: 'st' } },
            { $unwind: '$st' },
            { $group: { _id: '$st.movie', totalSeats: { $sum: '$totalSeats' }, revenue: { $sum: '$revenue' } } },
            { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } },
            { $unwind: '$movie' },
            { $project: { title: '$movie.title', poster: '$movie.poster', totalSeats: 1, revenue: 1 } },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);
        const summary = await models_1.Payment.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalTransactions: { $sum: 1 } } }
        ]);
        const bookingStats = await models_1.Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const newUsersThisMonth = await models_1.User.countDocuments({
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
        });
        return res.json({
            success: true,
            data: {
                revenue,
                topMovies,
                summary: summary[0] || { totalRevenue: 0, totalTransactions: 0 },
                bookingStats,
                newUsersThisMonth,
            }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /admin/reports/occupancy - tỷ lệ lấp đầy
async function getOccupancyReport(req, res) {
    try {
        const showtimes = await models_1.Showtime.find({ isActive: true })
            .populate('movie', 'title')
            .populate('room', 'totalSeats name')
            .populate('theater', 'name')
            .sort({ startTime: -1 }).limit(20);
        const data = showtimes.map((st) => ({
            movie: st.movie?.title,
            room: st.room?.name,
            theater: st.theater?.name,
            startTime: st.startTime,
            totalSeats: st.room?.totalSeats || 0,
            bookedSeats: st.bookedSeats?.length || 0,
            occupancyRate: st.room?.totalSeats
                ? Math.round((st.bookedSeats?.length || 0) / st.room.totalSeats * 100)
                : 0,
        }));
        return res.json({ success: true, data });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /reports/user-behavior/:userId
async function getUserBehavior(req, res) {
    try {
        const targetId = req.params.userId === 'me' ? req.user.id : req.params.userId;
        const bookings = await models_1.Booking.find({
            user: targetId,
            status: { $in: ['confirmed', 'checked_in'] }
        })
            .populate({ path: 'showtime', populate: [
                { path: 'movie', select: 'title genres poster duration' },
                { path: 'theater', select: 'name city' },
            ] })
            .lean();
        const totalSpent = bookings.reduce((s, b) => s + (b.paidAmount || b.totalAmount), 0);
        const genreCount = {};
        bookings.forEach(b => {
            const movie = b.showtime?.movie;
            (movie?.genres || []).forEach((g) => {
                genreCount[g] = (genreCount[g] || 0) + 1;
            });
        });
        const favoriteGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre, count]) => ({
            genre,
            count,
            pct: bookings.length ? Math.round(count / bookings.length * 100) : 0
        }));
        const personaMap = {
            'Hành động': 'Tín đồ phim hành động',
            'Kinh dị': 'Người yêu thích cảm giác mạnh',
            'Hài': 'Người thích giải trí',
            'Tâm lý': 'Cinephile',
            'Khoa học viễn tưởng': 'Người mê Sci-Fi',
            'Hoạt hình': 'Người yêu gia đình',
        };
        const topGenre = favoriteGenres[0]?.genre || '';
        const persona = personaMap[topGenre] || 'Người xem đa dạng';
        const hourDist = Array(24).fill(0);
        const weekdayDist = Array(7).fill(0);
        bookings.forEach(b => {
            const d = new Date(b.showtime?.startTime);
            if (!isNaN(d.getTime())) {
                hourDist[d.getHours()]++;
                weekdayDist[d.getDay()]++;
            }
        });
        const theaterCount = {};
        bookings.forEach(b => {
            const name = b.showtime?.theater?.name;
            if (name)
                theaterCount[name] = (theaterCount[name] || 0) + 1;
        });
        const favoriteTheater = Object.entries(theaterCount).sort((a, b) => b[1] - a[1])[0];
        const avgSeats = bookings.length
            ? +(bookings.reduce((s, b) => s + b.seats.length, 0) / bookings.length).toFixed(1)
            : 0;
        const recentMovies = [...bookings]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(b => ({
            title: b.showtime?.movie?.title,
            poster: b.showtime?.movie?.poster,
            genres: b.showtime?.movie?.genres,
            watchedAt: b.createdAt,
            theater: b.showtime?.theater?.name,
            paidAmount: b.paidAmount || b.totalAmount,
        }));
        const reviews = await models_1.Review.find({ user: targetId })
            .populate('movie', 'title poster genres').lean();
        const avgRating = reviews.length
            ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
            : 0;
        return res.json({
            success: true,
            data: {
                totalMovies: bookings.length,
                totalSpent,
                persona,
                favoriteGenres,
                hourDistribution: hourDist,
                weekdayDistribution: weekdayDist,
                favoriteTheater: favoriteTheater
                    ? { name: favoriteTheater[0], count: favoriteTheater[1] }
                    : null,
                avgSeatsPerBooking: avgSeats,
                recentMovies,
                totalReviews: reviews.length,
                avgRating,
            }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /reports/admin/user-trends
async function getUserTrends(req, res) {
    try {
        const genreTrends = await models_1.Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'checked_in'] } } },
            { $lookup: { from: 'showtimes', localField: 'showtime', foreignField: '_id', as: 'st' } },
            { $unwind: '$st' },
            { $lookup: { from: 'movies', localField: 'st.movie', foreignField: '_id', as: 'movie' } },
            { $unwind: '$movie' },
            { $unwind: '$movie.genres' },
            { $group: { _id: '$movie.genres', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);
        const peakHoursRaw = await models_1.Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'checked_in'] } } },
            { $lookup: { from: 'showtimes', localField: 'showtime', foreignField: '_id', as: 'st' } },
            { $unwind: '$st' },
            { $group: { _id: { $hour: { date: '$st.startTime', timezone: '+07:00' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const userGroupsRaw = await models_1.Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'checked_in'] } } },
            { $group: { _id: '$user', totalBookings: { $sum: 1 } } },
            { $group: {
                    _id: null,
                    casual: { $sum: { $cond: [{ $lte: ['$totalBookings', 2] }, 1, 0] } },
                    regular: { $sum: { $cond: [{ $and: [{ $gt: ['$totalBookings', 2] }, { $lte: ['$totalBookings', 6] }] }, 1, 0] } },
                    loyal: { $sum: { $cond: [{ $gt: ['$totalBookings', 6] }, 1, 0] } },
                } }
        ]);
        const retentionData = await models_1.Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'checked_in'] } } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $group: {
                    _id: null,
                    total: { $sum: 1 },
                    returning: { $sum: { $cond: [{ $gte: ['$count', 2] }, 1, 0] } }
                } }
        ]);
        const retention = retentionData[0]
            ? Math.round(retentionData[0].returning / retentionData[0].total * 100)
            : 0;
        return res.json({
            success: true,
            data: {
                genreTrends,
                peakHours: Array(24).fill(0).map((_, h) => ({
                    hour: h,
                    count: peakHoursRaw.find((p) => p._id === h)?.count || 0
                })),
                userGroups: userGroupsRaw[0] || { casual: 0, regular: 0, loyal: 0 },
                retentionRate: retention,
            }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=report.controller.js.map