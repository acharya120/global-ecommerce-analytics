// Cost-control settings. Everything risky is OFF unless explicitly enabled via env.
const bool = (v, d) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export function getConfig(env = process.env) {
  return {
    liveModeEnabled: bool(env.LIVE_MODE_ENABLED, false),
    paidProvidersEnabled: bool(env.PAID_PROVIDERS_ENABLED, false),
    aiEnabled: bool(env.AI_ENABLED, false) && Boolean(env.OPENAI_API_KEY),
    openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
    cacheTtlSeconds: num(env.CACHE_TTL_SECONDS, 1800), // default 30 minutes
    requestTimeoutMs: Math.min(num(env.REQUEST_TIMEOUT_MS, 8000), 25000),
    rateLimitPerMinute: num(env.RATE_LIMIT_PER_MINUTE, 30),
    maxApiCallsPerDay: num(env.MAX_API_CALLS_PER_DAY, 50),
    aiMaxCallsPerDay: num(env.AI_MAX_CALLS_PER_DAY, 20),
    redis: { url: env.UPSTASH_REDIS_REST_URL || '', token: env.UPSTASH_REDIS_REST_TOKEN || '' },
    keys: {
      openai: env.OPENAI_API_KEY || '',
      bestBuy: env.BESTBUY_API_KEY || '',
      scraperApi: env.SCRAPER_API_KEY || '',
      scrapingBee: env.SCRAPINGBEE_API_KEY || '',
      brightData: env.BRIGHTDATA_API_KEY || '',
    },
  };
}

// Never expose secrets: only booleans / numbers.
export function publicSettings(config = getConfig()) {
  return {
    demoMode: 'always available',
    liveModeEnabled: config.liveModeEnabled,
    paidProvidersEnabled: config.paidProvidersEnabled,
    aiEnabled: config.aiEnabled,
    redisConfigured: Boolean(config.redis.url && config.redis.token),
    cacheTtlSeconds: config.cacheTtlSeconds,
    requestTimeoutMs: config.requestTimeoutMs,
    rateLimitPerMinute: config.rateLimitPerMinute,
    maxApiCallsPerDay: config.maxApiCallsPerDay,
    aiMaxCallsPerDay: config.aiMaxCallsPerDay,
  };
}
