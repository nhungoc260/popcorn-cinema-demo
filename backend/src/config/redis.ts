import Redis from 'ioredis';

let redis: Redis | null = null;
let redisAvailable = false;

// ── In-Memory fallback ─────────────────────────────────────
const memStore = new Map<string, { value: string; expiresAt: number }>();

function memSet(key: string, value: string, ttlSeconds: number): boolean {
  const existing = memStore.get(key);
  if (existing && existing.expiresAt > Date.now()) return false;
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}
function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) { memStore.delete(key); return null; }
  return entry.value;
}
function memDel(key: string): void { memStore.delete(key); }
function memKeys(prefix: string): string[] {
  const now = Date.now();
  return [...memStore.entries()]
    .filter(([k, v]) => k.startsWith(prefix) && v.expiresAt > now)
    .map(([k]) => k);
}

export async function connectRedis(): Promise<void> {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    redis.on('error', () => {});
    await redis.connect();
    await redis.ping();
    redisAvailable = true;
    console.log('✅ Redis connected');
  } catch {
    redis = null;
    redisAvailable = false;
    console.warn('⚠️  Redis không khả dụng → dùng in-memory lock (dev mode)');
  }
}

const SEAT_LOCK_TTL = parseInt(process.env.SEAT_LOCK_TTL || '300');

async function storeSet(key: string, value: string, ttl: number): Promise<boolean> {
  if (redisAvailable && redis) {
    const r = await redis.set(key, value, 'EX', ttl, 'NX');
    return r === 'OK';
  }
  return memSet(key, value, ttl);
}
async function storeGet(key: string): Promise<string | null> {
  if (redisAvailable && redis) return redis.get(key);
  return memGet(key);
}
async function storeDel(key: string): Promise<void> {
  if (redisAvailable && redis) { await redis.del(key); return; }
  memDel(key);
}
async function storeKeys(prefix: string): Promise<string[]> {
  if (redisAvailable && redis) return redis.keys(prefix + '*');
  return memKeys(prefix);
}

export async function lockSeat(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
  return storeSet(`seat_lock:${showtimeId}:${seatId}`, userId, SEAT_LOCK_TTL);
}
export async function unlockSeat(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
  const key = `seat_lock:${showtimeId}:${seatId}`;
  const current = await storeGet(key);
  if (current === userId) { await storeDel(key); return true; }
  return false;
}
export async function getSeatLockOwner(showtimeId: string, seatId: string): Promise<string | null> {
  return storeGet(`seat_lock:${showtimeId}:${seatId}`);
}
export async function lockMultipleSeats(showtimeId: string, seatIds: string[], userId: string): Promise<{ success: boolean; failed: string[] }> {
  const failed: string[] = [];
  for (const seatId of seatIds) {
    const ok = await lockSeat(showtimeId, seatId, userId);
    if (!ok) failed.push(seatId);
  }
  if (failed.length > 0) {
    for (const seatId of seatIds) {
      if (!failed.includes(seatId)) await unlockSeat(showtimeId, seatId, userId);
    }
    return { success: false, failed };
  }
  return { success: true, failed: [] };
}
export async function unlockAllUserSeats(showtimeId: string, userId: string): Promise<void> {
  const keys = await storeKeys(`seat_lock:${showtimeId}:`);
  for (const key of keys) {
    const owner = await storeGet(key);
    if (owner === userId) await storeDel(key);
  }
}

// ── Aliases for backward compatibility ───────────────────
export const lockSeats = (showtimeId: string, userId: string, seatIds: string[]) =>
  lockMultipleSeats(showtimeId, seatIds, userId);

export const releaseSeats = (showtimeId: string, userId: string) =>
  unlockAllUserSeats(showtimeId, userId);

export const getLockedSeats = async (showtimeId: string): Promise<string[]> => {
  const keys = await storeKeys(`seat_lock:${showtimeId}:`);
  return keys.map(k => k.split(':')[2]).filter(Boolean);
};
