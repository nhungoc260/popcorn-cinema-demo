import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare function getMovies(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMovie(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createMovie(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateMovie(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteMovie(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=movie.controller.d.ts.map