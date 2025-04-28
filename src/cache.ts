import Redis, { Cluster, RedisOptions, ClusterOptions, ClusterNode as RedisClusterNode } from 'ioredis'
import { CacheError } from './errors/CacheError'

// Type alias for serializable data types that can be stored in the cache
export type Serializable = string | number | boolean | Record<string, any> | Array<any> | null

// Type alias for the callback function used in caching patterns like `remember` and `forever`
type Callback<T> = T | (() => Promise<T> | T)

// Interface that extends RedisOptions for custom cache options
export interface CacheOptions extends RedisOptions {}

// Type alias for cluster nodes used in Redis Cluster
export type ClusterNode = RedisClusterNode

// Type alias for Redis connection parameters
type RedisConnectionParams = [number] | [number, string] | [string] | [RedisOptions] | [string, object?] | [Redis]

// Define all possible events emitted by the Cache instance
type Events = {
  connect: () => void
  ready: () => void
  error: (error: Error) => void
  close: () => void
  reconnecting: () => void
  end: () => void
  warning: (warning: Error) => void
}

/**
 * Robust Redis caching client with TypeScript support
 *
 * @example
 * const cache = new Cache({ host: 'localhost', port: 6379 });
 * await cache.set('key', { data: 'value' }, 3600);
 *
 * @public
 */
class Cache {
  // Redis client instance (single or cluster)
  private readonly redis: Redis | Cluster

  // Constructor for initializing Cache instance
  constructor(client: Redis | Cluster)
  constructor(options?: CacheOptions)
  constructor(...args: ConstructorParameters<typeof Redis>)
  constructor(...args: RedisConnectionParams)
  constructor(...args: any[]) {
    // If the first argument is an instance of Redis, use it directly
    if (args[0] instanceof Redis) {
      this.redis = args[0]
    } else {
      // Otherwise, initialize a new Redis client with the provided options
      this.redis = new Redis(...(args as ConstructorParameters<typeof Redis>))
    }
  }

  /**
   * Create a Cache instance connected to Redis Cluster
   * @param nodes - Array of cluster nodes
   * @param options - Cluster connection options
   */
  static Cluster(nodes: ClusterNode[], options?: ClusterOptions): Cache {
    const cluster = new Redis.Cluster(nodes, options)
    return new Cache(cluster)
  }

  /**
   * Retrieve value from cache
   * @param key - Cache key
   * @returns Parsed value or null if not found
   */
  async get<T extends Serializable>(key: string): Promise<T | null> {
    try {
      // Fetch value from Redis and parse it
      const data = await this.redis.get(key)
      return data ? this.parse<T>(data) : null
    } catch (error) {
      // Handle error and return fallback value
      return this.handleError('GET', error, null)
    }
  }

  /**
   * Store value in cache with optional TTL
   * @param key - Cache key
   * @param value - Serializable value
   * @param ttl - Time-to-live in seconds
   */
  async set<T extends Serializable>(key: string, value: T, ttl?: number): Promise<'OK'> {
    try {
      // Serialize value before storing in cache
      const serialized = this.serialize(value)
      // Set value with optional TTL (Time-to-live)
      return ttl ? await this.redis.setex(key, ttl, serialized) : await this.redis.set(key, serialized)
    } catch (error) {
      // Handle error during the set operation
      throw this.handleError('SET', error)
    }
  }

  /**
   * Cache-aside pattern: Retrieves value from cache or computes/store it if not present
   * @param key - Cache key
   * @param ttl - Time-to-live in seconds
   * @param callback - Callback function to compute the value if cache is empty
   * @returns Computed or cached value
   */
  async remember<T extends Serializable>(key: string, ttl: number, callback: Callback<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached

    const result = await this.resolve(callback)
    await this.set(key, result, ttl)
    return result
  }

  /**
   * Cache-forever pattern: Retrieves value from cache or computes/store it indefinitely
   * @param key - Cache key
   * @param callback - Callback function to compute the value if cache is empty
   * @returns Computed or cached value
   */
  async forever<T extends Serializable>(key: string, callback: Callback<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached

    const result = await this.resolve(callback)
    await this.set(key, result)
    return result
  }

  /**
   * Delete cached value by key
   * @param key - Cache key
   * @returns Number of deleted keys
   */
  async delete(key: string): Promise<number> {
    try {
      return await this.redis.del(key)
    } catch (error) {
      // Handle error during delete operation
      throw this.handleError('DELETE', error)
    }
  }

  /**
   * Flush all cached data
   * @returns "OK" if operation was successful
   */
  async flush(): Promise<'OK'> {
    try {
      return await this.redis.flushall()
    } catch (error) {
      // Handle error during flush operation
      throw this.handleError('FLUSH', error, 'OK')
    }
  }

  /**
   * Check if a key exists in the cache
   * @param key - Cache key
   * @returns True if the key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const count = await this.redis.exists(key)
    return count > 0
  }

  /**
   * Serialize data before storing it in Redis
   * @param data - Data to serialize
   * @returns Serialized string value
   */
  private serialize<T>(data: T): string {
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return String(data) // Convert the primitive value to string if needed
    }

    try {
      return JSON.stringify(data)
    } catch (error) {
      throw new Error(`Failed to serialize data: ${(error as Error).message}`)
    }
  }

  /**
   * Parse a Redis value back to its original form
   * @param data - Redis stored value as string
   * @returns Parsed value
   */
  private parse<T>(data: string): T {
    try {
      return JSON.parse(data) as T
    } catch (error) {
      return data as unknown as T
    }
  }

  /**
   * Resolves a value, either directly or through a callback function
   * @param valueOrCallback - Direct value or a function returning a value
   * @returns Resolved value
   */
  private async resolve<T>(valueOrCallback: T | (() => T | Promise<T>)): Promise<T> {
    if (typeof valueOrCallback === 'function') {
      return await (valueOrCallback as () => T | Promise<T>)()
    }
    return valueOrCallback
  }

  /**
   * Handle errors that occur during Redis operations
   * @param operation - Operation that failed (e.g., "GET", "PUT")
   * @param error - The error object
   * @param fallback - Fallback value to return if provided
   * @returns Either the fallback or throws a CacheError
   */
  private handleError<T>(operation: string, error: unknown, fallback?: T): T | null {
    const message = `Cache ${operation} operation failed: ${(error as Error).message}`
    console.error(message)

    if (typeof fallback !== 'undefined') {
      return fallback
    }

    throw new CacheError(operation, message)
  }

  /**
   * Attach an event listener to a Redis event
   * @param event - Event to listen for
   * @param listener - Event handler function
   * @returns Cache instance
   */
  on<K extends keyof Events>(event: K, listener: Events[K]): this {
    this.redis.on(event, listener)
    return this
  }

  /**
   * Attach a one-time event listener to a Redis event
   * @param event - Event to listen for
   * @param listener - Event handler function
   * @returns Cache instance
   */
  once<K extends keyof Events>(event: K, listener: Events[K]): this {
    this.redis.once(event, listener)
    return this
  }

  /**
   * Remove an event listener from a Redis event
   * @param event - Event to remove the listener from
   * @param listener - Event handler function to remove
   * @returns Cache instance
   */
  off<K extends keyof Events>(event: K, listener: Events[K]): this {
    this.redis.off(event, listener)
    return this
  }

  /**
   * Get the underlying Redis client instance (single or cluster)
   * @returns Redis or Cluster instance
   */
  client(): Redis | Cluster {
    return this.redis
  }
}

export { Cache }
