export const AUCTION_CONFIG = {
  EXTENSION_MINUTES: 3,
  LAST_MINUTES_THRESHOLD: 3, // 3 minutos para verificar pujas
  CHECK_INTERVALS: {
    CRITICAL: 1000,      // 1s últimos 10min
    HIGH: 60000,         // 1min últimos 30min  
    MEDIUM: 600000,      // 10min última hora
    LOW: 3600000         // 1h más de 1 hora
  },
  CACHE_TTL: 30000, // 30 segundos
};