# @rediskit/cache · [![npm version](https://img.shields.io/npm/v/@rediskit/cache)](https://www.npmjs.com/package/@rediskit/cache) [![@rediskit/cache](https://github.com/rediskit/cache/actions/workflows/test.yml/badge.svg)](https://github.com/rediskit/cache/actions)

**A robust Redis caching layer built on ioredis**
TypeScript-first solution for modern caching patterns with enterprise-grade reliability.

## Features

- 🚀 **Simple Redis Connection Management**
- 🔄 **Full Redis Feature Support**: Single instances, clusters, and sentinel configurations.
- ⏱ **TTL (Time-To-Live) Support**
- 🔄 **Automatic JSON Serialization/Deserialization**: Automatic handling with primitive optimization.
- 🛠 **Flexible Redis Client Configuration**
- ✅ **Type-Safe Operations**: Generics-powered API with strict type validation.
- 🛡 **Comprehensive Error Handling**: Contextual errors with original stack traces.
- 🗄 **Cache Patterns**:
  - ♻️ **Cache-Aside Pattern**: Built-in support for cache-aside.
  - 🔄 **Write-Through Pattern**: Built-in support for write-through caching.
- ⚡ **Event-Driven Architecture**: Native Redis event forwarding and monitoring.

## Installation

```bash
npm install @rediskit/cache
// or
bun install @rediskit/cache
```

### Configuration

```typescript
import { Cache } from '@rediskit/cache'
// or
const { Cache } = require('@rediskit/cache')

const cache = new Cache() // Connect to 127.0.0.1:6379
// or
const cache = new Cache(6380) // 127.0.0.1:6380
// or
const cache = new Cache(6379, '192.168.1.1') // 192.168.1.1:6379
// or
const cache = new Cache('/tmp/redis.sock')
// or
const cache = new Cache({ host: 'redis.example.com', port: 6379 })
// or
const cache = new Cache({
  port: 6379, // Redis port
  host: '127.0.0.1', // Redis host
  username: 'default', // needs Redis >= 6
  password: 'my-top-secret',
  db: 0, // Defaults to 0
})

// Cache Cluster
const cache = Cache.Cluster([{ host: 'cluster-node1', port: 7000 }], { scaleReads: 'slave' })
```

### Advanced Configuration

```typescript
import { Redis } from 'ioredis'

// iordis client
const redis = new Redis({
  sentinels: [
    { host: 'sentinel1.example.com', port: 26379 },
    { host: 'sentinel2.example.com', port: 26379 },
  ],
  name: 'redis-master',
})
// or

// Redis Cluster
const redis = Redis.Cluster([{ host: 'cluster-node1', port: 7000 }], { scaleReads: 'slave' })

const cache = new Cache(redis)
```

## Basic Usage

```ts
import { Cache } from '@rediskit/cache'

// Create an instance of the cache
const cache = new Cache({
  host: '127.0.0.1',
  port: 6379,
})

// Store a value without TTL
await cache.set('user:1', { name: 'John Doe' })

// Retrieve the value
const user = await cache.get<{ name: string }>('user:1')
console.log(user) // Output: { name: "John Doe" }

// Set value with TTL
await cache.set('user:100', { name: 'John Doe' }, 3600)

// Get typed value
const user = await cache.get<{ name: string }>('user:100')
console.log(user) // Output: { name: "John Doe" }

// Use the remember pattern
const remembered = await cache.remember('user:2', 3600, { name: 'Jane Doe' })
// or
const remembered = await cache.remember('user:2', 3600, () => {
  return { name: 'Jane Doe' }
})
// or
const remembered = await cache.remember('user:2', 3600, async () => {
  return { name: 'Jane Doe' }
})
console.log(remembered) // Output: { name: "Jane Doe" }

// Cache-aside pattern
const orders = await cache.remember('user:100:orders', 300, async () => {
  return fetchRecentOrders(100)
})

// Use the forever pattern
const forever = await cache.forever('user:2', { name: 'Jane Doe' })
// or
const forever = await cache.forever('user:2', () => {
  return { name: 'Jane Doe' }
})
// or
const forever = await cache.forever('user:2', async () => {
  return { name: 'Jane Doe' }
})
console.log(forever) // Output: { name: "Jane Doe" }

// Delete a value
await cache.delete('user:1')

// Flush all cache
await cache.flush()
```

### Event Handling

```typescript
cache.on('ready', () => console.log('Cache operational'))
cache.on('error', (err) => console.error('Cache error:', err))
```

### Error Management

```typescript
try {
  await cache.set('transient:key', sensitiveData)
} catch (err) {
  if (err instanceof CacheError) {
    console.error(`Operation ${err.operation} failed:`, err.cause)
  }
}
```

## Core Methods

| Method     | Signature                                                                  | Description                   |
| ---------- | -------------------------------------------------------------------------- | ----------------------------- |
| `set`      | `(key: string, value: Serializable, ttl?: number) => Promise<'OK'>`        | Store value with optional TTL |
| `get`      | `<T>(key: string) => Promise<T \| null>`                                   | Retrieve typed value          |
| `remember` | `<T>(key: string, ttl: number, callback: () => Callback<T>) => Promise<T>` | Cache/store pattern           |
| `forever`  | `<T>(key: string, callback: () => Callback<T>) => Promise<T>`              | Cache/store pattern           |
| `delete`   | `(key: string) => Promise<number>`                                         | Remove cached entry           |
| `flush`    | `() => Promise<'OK'>`                                                      | Clear all cache data          |

### `set`

Stores a value in the cache. Optionally accepts a TTL (time-to-live) to specify how long the value should remain in the cache.

- **Parameters**:

  - `key`: The cache key (string).
  - `value`: The value to be stored, which must be serializable.
  - `ttl`: Optional time-to-live in seconds.

- **Returns**: Promise that resolves to `'OK'` on successful operation.

### `get`

Retrieves the cached value for the specified key.

- **Parameters**:

  - `key`: The cache key (string).

- **Returns**: Promise that resolves to the cached value (typed according to the value's type) or `null` if the key does not exist.

### `remember`

Stores a value in the cache if it doesn't already exist, using a callback to generate the value if necessary.

- **Parameters**:

  - `key`: The cache key (string).
  - `ttl`: Time-to-live in seconds.
  - `callback`: `value, function or async function` A function that returns the value to be cached.

- **Returns**: Promise that resolves to the cached value.

### `forever`

Stores a value in the cache if it doesn't already exist, using a callback to generate the value if necessary.

- **Parameters**:

  - `key`: The cache key (string).
  - `callback`: `value, function or async function` A function that returns the value to be cached.

- **Returns**: Promise that resolves to the cached value.

### `delete`

Removes a value from the cache by its key.

- **Parameters**:

  - `key`: The cache key (string).

- **Returns**: Promise that resolves to the number of deleted entries.

### `flush`

Clears all data from the cache.

- **Returns**: Promise that resolves to `'OK'` on successful operation.

## Architecture & Design

### Inspired by ioredis

Leverages the robustness of ioredis while adding type safety and higher-level caching abstractions.

#### Key Decisions:

- **Serialization Layer**
  Smart JSON handling with direct primitive storage.

- **Cluster Support**
  Native Redis Cluster integration through ioredis.

- **Error Taxonomy**
  Operational errors preserve original stack traces.

- **Type Enforcement**
  Strict type boundaries for cache operations.

## Compatibility

- Node.js 16+ (LTS releases)
- Redis 4.0+ (single instance/cluster modes)
- ioredis 5.3+ (peer dependency)

[→ Full API Reference](https://github.com/redis/ioredis/blob/main/README.md)

## License

MIT © @rediskit/cache

## Report Issues

[https://github.com/rediskit/cache/issues](https://github.com/rediskit/cache/issues)

## Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Disclaimer

Rediskit is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Redis Ltd.
