import { Server } from 'socket.io';
import http from 'http';
export declare function initSocket(server: http.Server): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function trackSeatLock(showtimeId: string, seatIds: string[]): void;
export declare function getIO(): Server;
//# sourceMappingURL=socketServer.d.ts.map