import { Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare function initiatePayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function confirmPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function adminConfirmPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function adminRejectPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getPendingPayments(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getPaymentStatus(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getPaymentByBooking(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=payment.controller.d.ts.map