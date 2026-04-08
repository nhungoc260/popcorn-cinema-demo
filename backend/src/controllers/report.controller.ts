import { Request, Response } from 'express';
import { Booking, Payment, Movie, User, Showtime } from '../models';

// GET /admin/reports/revenue?period=day|week|month|year
export async function getRevenueReport(req: Request, res: Response) {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      groupFormat = '%Y-%m-%d';
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%U';
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear() - 2, 0, 1);
      groupFormat = '%Y-%m';
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      groupFormat = '%Y-%m';
    }

    const revenue = await Payment.aggregate([
      { $match: { status: 'success', createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt', timezone: '+07:00' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const topMovies = await Booking.aggregate([
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

    const summary = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalTransactions: { $sum: 1 } } }
    ]);

    const bookingStats = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const newUsersThisMonth = await User.countDocuments({
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /admin/reports/occupancy - tỷ lệ lấp đầy
export async function getOccupancyReport(req: Request, res: Response) {
  try {
    const showtimes = await Showtime.find({ isActive: true })
      .populate('movie', 'title')
      .populate('room', 'totalSeats name')
      .populate('theater', 'name')
      .sort({ startTime: -1 }).limit(20);

    const data = showtimes.map((st: any) => ({
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}