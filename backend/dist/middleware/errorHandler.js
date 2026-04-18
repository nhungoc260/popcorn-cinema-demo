"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.errorHandler = errorHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
async function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ success: false, message: 'No token provided' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        // Check isActive
        const user = await models_1.User.findById(decoded.id).select('isActive').lean();
        if (!user || user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ admin.' });
        }
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        next();
    };
}
// ── Error Handler ──────────────────────────────────────────
function errorHandler(err, req, res, _next) {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ success: false, message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
}
//# sourceMappingURL=errorHandler.js.map