interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

// In-memory IP-based tracker
const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.blockedUntil && record.blockedUntil < now) {
      loginAttempts.delete(key);
    } else if (now - record.firstAttemptAt > WINDOW_MS && !record.blockedUntil) {
      loginAttempts.delete(key);
    }
  }
}

export function checkLoginRateLimit(ip: string): {
  allowed: boolean;
  waitMinutes?: number;
  remainingAttempts?: number;
} {
  cleanupExpired();
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    const waitMinutes = Math.max(1, Math.ceil((record.blockedUntil - now) / 60000));
    return { allowed: false, waitMinutes };
  }

  // If window expired and not blocked, it can reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return { allowed: true, remainingAttempts: remaining };
}

export function recordFailedLogin(ip: string): { remainingAttempts: number; isBlocked: boolean; waitMinutes?: number } {
  cleanupExpired();
  const now = Date.now();
  let record = loginAttempts.get(ip);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    record = { attempts: 1, firstAttemptAt: now };
    loginAttempts.set(ip, record);
    return { remainingAttempts: MAX_ATTEMPTS - 1, isBlocked: false };
  }

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_MS;
    const waitMinutes = Math.ceil(LOCKOUT_MS / 60000);
    return { remainingAttempts: 0, isBlocked: true, waitMinutes };
  }

  return { remainingAttempts: MAX_ATTEMPTS - record.attempts, isBlocked: false };
}

export function resetLoginRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

