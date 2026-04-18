import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare function getReviews(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createReview(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteReview(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=review.controller.d.ts.map