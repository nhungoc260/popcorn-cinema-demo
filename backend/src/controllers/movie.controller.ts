import { Request, Response } from 'express';
import { Movie, Showtime } from '../models';
import { AuthRequest } from '../middleware/errorHandler';

// GET /movies
export async function getMovies(req: Request, res: Response) {
  try {
    const { status, genre, search, page = 1, limit = 100 } = req.query;
    const filter: any = { isActive: true };
    if (status) filter.status = status;
    if (genre) filter.genres = { $in: [genre] };
    if (search) filter.title = { $regex: search, $options: 'i' };

    const movies = await Movie.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();
    const total = await Movie.countDocuments(filter);

    return res.json({ success: true, data: movies, total });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /movies/:id
export async function getMovie(req: Request, res: Response) {
  try {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    return res.json({ success: true, data: movie });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /movies (admin)
export async function createMovie(req: AuthRequest, res: Response) {
  try {
    const movie = await Movie.create(req.body);
    return res.status(201).json({ success: true, data: movie });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /movies/:id (admin)
export async function updateMovie(req: AuthRequest, res: Response) {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });

    // Nếu phim chuyển sang "ended" hoặc "suspended" → ẩn TẤT CẢ suất chiếu
    if (req.body.status === 'ended' || req.body.status === 'suspended') {
      await Showtime.updateMany(
        { movie: req.params.id, isActive: true },
        { isActive: false }
      );
    }

    return res.json({ success: true, data: movie });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /movies/:id (admin)
export async function deleteMovie(req: AuthRequest, res: Response) {
  try {
    await Movie.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ success: true, message: 'Movie deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}