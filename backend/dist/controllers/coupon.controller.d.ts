import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare function validateCoupon(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function applyCoupon(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getCoupons(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createCoupon(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteCoupon(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMyLoyalty(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function addLoyaltyPoints(userId: string, points: number, action: string, ref?: string): Promise<import("mongoose").Document<unknown, {}, import("../models").ILoyalty, {}, {}> & import("../models").ILoyalty & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=coupon.controller.d.ts.map