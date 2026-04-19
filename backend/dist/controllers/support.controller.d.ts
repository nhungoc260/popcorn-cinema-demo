import { Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare const createTicket: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTickets: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateTicket: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=support.controller.d.ts.map