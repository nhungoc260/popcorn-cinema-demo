import { Request, Response } from 'express';
import { Showtime, Seat } from '../models';
import { getSeatLockOwner, getLockedSeats } from '../config/redis';

// GET /showtimes?movieId=&date=&theaterId=
export async function getShowtimes(req: Request, res: Response) {
  try {
    const { movieId, date, theaterId } = req.query;
    const filter: any = { isActive: true };
    if (movieId) filter.movie = movieId;
    if (theaterId) filter.theater = theaterId;
    if (date) {
      const d = new Date(date as string);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.startTime = { $gte: d, $lt: next };
    }

    const showtimes = await Showtime.find(filter)
      .populate('movie', 'title poster duration genre rating')
      .populate('theater', 'name city address')
      .populate('room', 'name totalSeats')
      .sort({ startTime: 1 })
      .lean();

    // Add availableSeats count
    const data = showtimes.map((st: any) => ({
      ...st,
      availableSeats: (st.room?.totalSeats || 0) - (st.bookedSeats?.length || 0),
    }));

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /showtimes/:id
export async function getShowtime(req: Request, res: Response) {
  try {
    const st = await Showtime.findById(req.params.id)
      .populate('movie', 'title poster duration genre rating')
      .populate('theater', 'name city address')
      .populate('room', 'name totalSeats seats')
      .lean();
    if (!st) return res.status(404).json({ success: false, message: 'Showtime not found' });
    return res.json({ success: true, data: st });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /showtimes/:id/seats
export async function getShowtimeSeats(req: Request, res: Response) {
  try {
    const st = await Showtime.findById(req.params.id)
      .populate('room', 'seats totalSeats name prices')
      .lean() as any;
    if (!st) return res.status(404).json({ success: false, message: 'Showtime not found' });

    const bookedIds = new Set((st.bookedSeats || []).map((id: any) => id.toString()));
    const lockedSeatIds = await getLockedSeats(req.params.id);

    let rawSeats: any[] = st.room?.seats || [];
    if (rawSeats.length === 0) {
      rawSeats = await Seat.find({ room: st.room?._id }).lean();
    }

    // Lấy bảng giá từ room.prices, fallback về giá mặc định
    const roomPrices = st.room?.prices || {}
    const DEFAULT_PRICES: Record<string, number> = {
      standard: 85000, vip: 110000, couple: 180000, recliner: 150000,
    }
    const getPrice = (type: string) =>
      roomPrices[type] ?? DEFAULT_PRICES[type] ?? 85000

    const seats = rawSeats
      .filter((seat: any) => seat.type !== 'aisle' && seat.type !== 'empty')
      .map((seat: any) => {
        const isBooked = bookedIds.has(seat._id.toString());
        const isLocked = lockedSeatIds.includes(seat._id.toString());
        const status = isBooked ? 'booked' : isLocked ? 'locked' : 'available';
        const colNum = seat.number ?? seat.col ?? 0;
        return {
          _id: seat._id,
          row: seat.row,
          col: colNum,
          number: colNum,
          label: seat.label || `${seat.row}${colNum}`,
          type: seat.type === 'aisle' ? 'disabled' : (seat.type || 'standard'),
          status,
          price: getPrice(seat.type),
          isBooked,
          lockedBy: isLocked ? 'other' : null,
        };
      });

    return res.json({ success: true, data: seats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}