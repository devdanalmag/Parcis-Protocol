// ═══ Parcis Ultra-Fast Data Cache & Request Deduplicator ═══

const cacheStore = new Map()
const inFlightRequests = new Map()

const DEFAULT_TTL = 60000 // 60s cache TTL (was 30s — dRPC can handle the staleness tradeoff)

/**
 * Fetches data with caching and deduplication.
 * Returns cached data immediately if valid. Deduplicates concurrent identical requests.
 */
export async function fetchWithCache(key, fetcher, ttlMs = DEFAULT_TTL) {
  const now = Date.now()

  if (cacheStore.has(key)) {
    const entry = cacheStore.get(key)
    if (now - entry.timestamp < ttlMs) {
      return entry.data
    }
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)
  }

  const promise = (async () => {
    try {
      const data = await fetcher()
      cacheStore.set(key, { data, timestamp: Date.now() })
      return data
    } finally {
      inFlightRequests.delete(key)
    }
  })()

  inFlightRequests.set(key, promise)
  return promise
}

/**
 * Gets cached data if present and valid. Synchronous — zero latency.
 */
export function getCachedData(key, ttlMs = DEFAULT_TTL) {
  if (cacheStore.has(key)) {
    const entry = cacheStore.get(key)
    if (Date.now() - entry.timestamp < ttlMs) {
      return entry.data
    }
  }
  return null
}

/**
 * Sets cached data directly. Used for pre-warming.
 */
export function setCachedData(key, data) {
  cacheStore.set(key, { data, timestamp: Date.now() })
}

/**
 * Invalidates cache by key or prefix pattern.
 */
export function invalidateCache(keyOrPrefix) {
  if (!keyOrPrefix) {
    cacheStore.clear()
    return
  }
  for (const k of cacheStore.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
      cacheStore.delete(k)
    }
  }
}

/**
 * Warms the cache for a given account by pre-fetching all dashboard data in parallel.
 * Called on wallet connect and dashboard mount to make all subsequent reads instant.
 */
export async function warmDashboardCache(account, fetchers) {
  if (!account) return
  const { getUSDCBalance, getUserLinks, getUserStreams, getUserDeals } = fetchers
  // Fire all 4 fetchers in parallel — each one self-caches via fetchWithCache
  await Promise.allSettled([
    getUSDCBalance().catch(() => '0.00'),
    getUserLinks(account).catch(() => []),
    getUserStreams(account).catch(() => []),
    getUserDeals().catch(() => []),
  ])
}
