import { Response } from 'express';
import { AuthRequest } from '../middleware/errorHandler';
export declare const getMyMembership: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addPoints: (userId: string, amount: number, ref?: string) => Promise<{
    pointsEarned: number;
    newTier: "bronze" | "silver" | "gold" | "platinum";
    tierChanged: boolean;
} | null>;
export declare const getPointsHistory: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=membership.controller.d.ts.map