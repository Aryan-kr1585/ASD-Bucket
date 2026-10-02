const DEFAULT_TTL = 60 * 1000; // 1 minute in milliseconds

// Cache store supporting both object and Map-like access
const cache = {
  get(key) {
    return this[key];
  },
  set(key, val) {
    this[key] = val;
    return this;
  },
  has(key) {
    return Object.prototype.hasOwnProperty.call(this, key);
  },
  delete(key) {
    delete this[key];
  },
  clear() {
    for (const k of Object.keys(this)) {
      delete this[k];
    }
  },
  keys() {
    return Object.keys(this);
  }
};

Object.defineProperties(cache, {
  get: { enumerable: false },
  set: { enumerable: false },
  has: { enumerable: false },
  delete: { enumerable: false },
  clear: { enumerable: false },
  keys: { enumerable: false }
});

function getTtl() {
  if (process.env.CACHE_TTL) {
    const parsed = Number(process.env.CACHE_TTL);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TTL;
}

function normalizeKey(req) {
  const fullUrl = req.originalUrl || req.url;
  const [pathname, search] = fullUrl.split('?');
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return search ? `${cleanPath}?${search}` : cleanPath;
}

function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const key = normalizeKey(req);
  const entry = cache.get(key);
  const now = Date.now();
  const ttl = getTtl();

  // If entry exists, check whether it is older than 1 minute (TTL)
  if (entry) {
    const isExpired = (now - entry.createdAt) >= ttl;
    if (!isExpired) {
      // Cache HIT: set header and return cached data immediately
      res.setHeader('X-Cache', 'HIT');
      return res.json(entry.data);
    } else {
      // If it has expired, do not use the cached value
      cache.delete(key);
    }
  }

  // Cache MISS: set header and fetch latest data from database
  res.setHeader('X-Cache', 'MISS');

  // Intercept res.json to store fresh value in cache
  let responseCached = false;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  function saveToCache(data) {
    if (!responseCached && res.statusCode >= 200 && res.statusCode < 300) {
      responseCached = true;
      cache.set(key, {
        data,
        createdAt: Date.now(),
        timestamp: Date.now(),
        cachedAt: Date.now()
      });
    }
  }

  res.json = function (body) {
    saveToCache(body);
    return originalJson(body);
  };

  res.send = function (body) {
    let parsed = body;
    if (typeof body === 'string') {
      try {
        parsed = JSON.parse(body);
      } catch (_) {}
    }
    saveToCache(parsed);
    return originalSend(body);
  };

  next();
}

// Invalidate cache entries that may contain stale data
function invalidateCache(id = null) {
  const keys = cache.keys();
  for (const key of keys) {
    const [cleanKey] = key.split('?');
    const pathPart = cleanKey.length > 1 && cleanKey.endsWith('/') ? cleanKey.slice(0, -1) : cleanKey;

    if (id !== null && id !== undefined && id !== 'all') {
      const strId = String(id);
      // Invalidate collection (/products) and specific item (/products/:id)
      if (
        pathPart === '/products' ||
        pathPart === '' ||
        pathPart === '/' ||
        pathPart === `/products/${strId}` ||
        pathPart === `/${strId}`
      ) {
        cache.delete(key);
      }
    } else if (id === 'all') {
      cache.delete(key);
    } else {
      // Invalidate collection (/products)
      if (
        pathPart === '/products' ||
        pathPart === '' ||
        pathPart === '/'
      ) {
        cache.delete(key);
      }
    }
  }
}

function clearCache() {
  cache.clear();
}

cacheMiddleware.cacheMiddleware = cacheMiddleware;
cacheMiddleware.invalidateCache = invalidateCache;
cacheMiddleware.clearCache = clearCache;
cacheMiddleware.cache = cache;
cacheMiddleware.DEFAULT_TTL = DEFAULT_TTL;

module.exports = cacheMiddleware;
