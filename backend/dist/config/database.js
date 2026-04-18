"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/popcorn_cinema';
    try {
        await mongoose_1.default.connect(uri);
        console.log('✅ MongoDB connected:', uri);
    }
    catch (err) {
        console.error('❌ MongoDB connection failed:', err);
        throw err;
    }
}
//# sourceMappingURL=database.js.map