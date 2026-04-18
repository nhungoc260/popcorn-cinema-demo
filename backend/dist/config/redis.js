"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLockedSeats = exports.releaseSeats = exports.lockSeats = void 0;
exports.connectRedis = connectRedis;
exports.lockSeat = lockSeat;
exports.unlockSeat = unlockSeat;
exports.getSeatLockOwner = getSeatLockOwner;
exports.lockMultipleSeats = lockMultipleSeats;
exports.unlockAllUserSeats = unlockAllUserSeats;
const ioredis_1 = __importDefault(require("ioredis"));
let redis = null;
let redisAvailable = false;
// ── In-Memory fallback ─────────────────────────────────────
const memStore = new Map();
function memSet(key, value, ttlSeconds) {
    const existing = memStore.get(key);
    if (existing && existing.expiresAt > Date.now())
        return false;
    memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
}
function memGet(key) {
    const entry = memStore.get(key);
    if (!entry)
        return null;
    if (entry.expiresAt <= Date.now()) {
        memStore.delete(key);
        return null;
    }
    return entry.value;
}
function memDel(key) { memStore.delete(key); }
function memKeys(prefix) {
    const now = Date.now();
    return [...memStore.entries()]
        .filter(([k, v]) => k.startsWith(prefix) && v.expiresAt > now)
        .map(([k]) => k);
}
async function connectRedis() {
    try {
        redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            enableOfflineQueue: false,
        });
        redis.on('error', () => { });
        await redis.connect();
        await redis.ping();
        redisAvailable = true;
        console.log('✅ Redis connected');
    }
    catch {
        redis = null;
        redisAvailable = false;
        console.warn('⚠️  Redis không khả dụng → dùng in-memory lock (dev mode)');
    }
}
const SEAT_LOCK_TTL = parseInt(process.env.SEAT_LOCK_TTL || '300');
async function storeSet(key, value, ttl) {
    if (redisAvailable && redis) {
        const r = await redis.set(key, value, 'EX', ttl, 'NX');
        return r === 'OK';
    }
    return memSet(key, value, ttl);
}
async function storeGet(key) {
    if (redisAvailable && redis)
        return redis.get(key);
    return memGet(key);
}
async function storeDel(key) {
    if (redisAvailable && redis) {
        await redis.del(key);
        return;
    }
    memDel(key);
}
async function storeKeys(prefix) {
    if (redisAvailable && redis)
        return redis.keys(prefix + '*');
    return memKeys(prefix);
}
async function lockSeat(showtimeId, seatId, userId) {
    return storeSet(`seat_lock:${showtimeId}:${seatId}`, userId, SEAT_LOCK_TTL);
}
async function unlockSeat(showtimeId, seatId, userId) {
    const key = `seat_lock:${showtimeId}:${seatId}`;
    const current = await storeGet(key);
    if (current === userId) {
        await storeDel(key);
        return true;
    }
    return false;
}
async function getSeatLockOwner(showtimeId, seatId) {
    return storeGet(`seat_lock:${showtimeId}:${seatId}`);
}
async function lockMultipleSeats(showtimeId, seatIds, userId) {
    const failed = [];
    for (const seatId of seatIds) {
        const ok = await lockSeat(showtimeId, seatId, userId);
        if (!ok)
            failed.push(seatId);
    }
    if (failed.length > 0) {
        for (const seatId of seatIds) {
            if (!failed.includes(seatId))
                await unlockSeat(showtimeId, seatId, userId);
        }
        return { success: false, failed };
    }
    return { success: true, failed: [] };
}
async function unlockAllUserSeats(showtimeId, userId) {
    const keys = await storeKeys(`seat_lock:${showtimeId}:`);
    for (const key of keys) {
        const owner = await storeGet(key);
        if (owner === userId)
            await storeDel(key);
    }
}
// ── Aliases for backward compatibility ───────────────────
const lockSeats = (showtimeId, userId, seatIds) => lockMultipleSeats(showtimeId, seatIds, userId);
exports.lockSeats = lockSeats;
const releaseSeats = (showtimeId, userId) => unlockAllUserSeats(showtimeId, userId);
exports.releaseSeats = releaseSeats;
const getLockedSeats = async (showtimeId) => {
    const keys = await storeKeys(`seat_lock:${showtimeId}:`);
    return keys.map(k => k.split(':')[2]).filter(Boolean);
};
exports.getLockedSeats = getLockedSeats;
//# sourceMappingURL=redis.js.map