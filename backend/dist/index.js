"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const socketServer_1 = require("./socket/socketServer");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const movie_routes_1 = __importDefault(require("./routes/movie.routes"));
const theater_routes_1 = __importDefault(require("./routes/theater.routes"));
const showtime_routes_1 = __importDefault(require("./routes/showtime.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const seat_routes_1 = __importDefault(require("./routes/seat.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const coupon_routes_1 = __importDefault(require("./routes/coupon.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.server = server;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
const API = '/api/v1';
app.use(`${API}/auth`, auth_routes_1.default);
app.use(`${API}/movies`, movie_routes_1.default);
app.use(`${API}/theaters`, theater_routes_1.default);
app.use(`${API}/showtimes`, showtime_routes_1.default);
app.use(`${API}/bookings`, booking_routes_1.default);
app.use(`${API}/payments`, payment_routes_1.default);
app.use(`${API}/seats`, seat_routes_1.default);
app.use(`${API}/admin`, admin_routes_1.default);
app.use(`${API}/users`, user_routes_1.default);
app.use(`${API}/movies/:movieId/reviews`, review_routes_1.default);
app.use(`${API}/coupons`, coupon_routes_1.default);
app.use(`${API}/reports`, report_routes_1.default);
app.use(`${API}/ai`, ai_routes_1.default);
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public')));
app.get('*', (_, res) => {
    res.sendFile(path_1.default.join(process.cwd(), 'public', 'index.html'));
});
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5000;
async function bootstrap() {
    try {
        await (0, database_1.connectDB)();
        await (0, redis_1.connectRedis)(); // không throw dù Redis offline
        (0, socketServer_1.initSocket)(server);
        server.listen(PORT, () => {
            console.log(`\n Popcorn Cinema API  →  http://localhost:${PORT}`);
            console.log(`📡 WebSocket ready`);
            console.log(`🏥 Health check      →  http://localhost:${PORT}/health\n`);
        });
    }
    catch (err) {
        console.error('Bootstrap failed:', err);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=index.js.map