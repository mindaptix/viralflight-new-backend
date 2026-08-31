const buckets = new Map();

const pruneBucket = (bucket, now) => {
  const windowMs = bucket.windowMs;
  bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < windowMs);
};

const rateLimit = ({ windowMs = 60_000, max = 10, keyPrefix = "rl" } = {}) => {
  return (req, res, next) => {
    const userId = req.user?.userId || req.ip;
    const key = `${keyPrefix}:${req.method}:${req.baseUrl}${req.path}:${userId}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { hits: [], windowMs };
      buckets.set(key, bucket);
    }

    pruneBucket(bucket, now);

    if (bucket.hits.length >= max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMITED",
      });
    }

    bucket.hits.push(now);
    next();
  };
};

export { rateLimit };
