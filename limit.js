// Günlük ücretsiz hak sınırı (IP başına).
// Upstash Redis ayarlıysa kalıcı ve tüm sunucularda ortak çalışır.
// Ayarlı değilse bellekte tutar (sadece test için; sunucu yeniden başlarsa sıfırlanır).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DAILY = Number(process.env.FREE_DAILY_LIMIT || 5);
let rl = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  rl = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(DAILY, "1 d"),
    prefix: "bk",
  });
}

const mem = new Map();

export async function checkLimit(key) {
  if (rl) {
    const r = await rl.limit(key);
    return { ok: r.success, remaining: Math.max(0, r.remaining), limit: DAILY };
  }
  const day = new Date().toISOString().slice(0, 10);
  const k = day + ":" + key;
  const used = (mem.get(k) || 0) + 1;
  mem.set(k, used);
  if (mem.size > 50000) mem.clear();
  return { ok: used <= DAILY, remaining: Math.max(0, DAILY - used), limit: DAILY };
}
