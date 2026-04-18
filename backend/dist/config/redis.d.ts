export declare function connectRedis(): Promise<void>;
export declare function lockSeat(showtimeId: string, seatId: string, userId: string): Promise<boolean>;
export declare function unlockSeat(showtimeId: string, seatId: string, userId: string): Promise<boolean>;
export declare function getSeatLockOwner(showtimeId: string, seatId: string): Promise<string | null>;
export declare function lockMultipleSeats(showtimeId: string, seatIds: string[], userId: string): Promise<{
    success: boolean;
    failed: string[];
}>;
export declare function unlockAllUserSeats(showtimeId: string, userId: string): Promise<void>;
export declare const lockSeats: (showtimeId: string, userId: string, seatIds: string[]) => Promise<{
    success: boolean;
    failed: string[];
}>;
export declare const releaseSeats: (showtimeId: string, userId: string) => Promise<void>;
export declare const getLockedSeats: (showtimeId: string) => Promise<string[]>;
//# sourceMappingURL=redis.d.ts.map