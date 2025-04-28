import { Cache } from './cache'
import { CacheError } from './errors/CacheError'

export { Cache, CacheError }
export type { CacheOptions, ClusterNode } from './cache'

export default Cache

// Add special CommonJS helper for default
// @ts-ignore
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { Cache, CacheError, default: Cache }
}
