import { Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare function getLoyaltyInfo(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function applyPoints(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createBooking(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMyBookings(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getBooking(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function cancelBooking(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function checkIn(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function requestRefund(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function staffRefund(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getAllBookings(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=booking.controller.d.ts.map