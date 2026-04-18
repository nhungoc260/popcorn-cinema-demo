import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare function register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function logout(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMe(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function verifyOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function googleLogin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function phoneSendOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function phoneVerifyOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.controller.d.ts.map