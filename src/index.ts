import { Cache } from './cache'
import Redis, { Cluster } from 'ioredis'
import { CacheError } from './errors/CacheError'

// Export classes
export { Cache, CacheError, Redis, Cluster }

// Export types
export type { CacheOptions, ClusterNode } from './cache'

// Default export for ESM
export default Cache

// CommonJS compatibility for `require('@rediskit/cache')`
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    Cache,
    CacheError,
    Redis,
    Cluster,
    default: Cache,
  }
}
