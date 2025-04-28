// tests/index.test.ts

import { Cache } from '../src/cache' // Adjust the import based on your structure

let cache: Cache

beforeAll(() => {
  cache = new Cache({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  })
})

afterAll(async () => {
  await cache.client().quit() // Close the Redis connection
})

describe('Cache', () => {
  const key = 'test-key'
  const value = { hello: 'world' }
  it('should put a value', async () => {
    const putResult = await cache.set(key, value, 3600)
    expect(putResult).toBe('OK')
  })

  it('should get a value', async () => {
    const getResult = await cache.get(key)
    expect(getResult).toEqual(value)
  })

  it('should return null for non-existing key', async () => {
    const getResult = await cache.get('non-existing-key')
    expect(getResult).toBeNull()
  })

  it('should expire key after TTL', async () => {
    const shortKey = 'short-key'
    await cache.set(shortKey, { expire: true }, 1) // 1 second TTL

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const getResult = await cache.get(shortKey)
    expect(getResult).toBeNull()
  })

  it('should remember and get cached value', async () => {
    const rememberKey = 'remember-key'
    const result = await cache.remember(rememberKey, 3600, async () => {
      return { remembered: true }
    })

    expect(result).toEqual({ remembered: true })

    // It should now get without running callback again
    const cachedResult = await cache.get(rememberKey)
    expect(cachedResult).toEqual({ remembered: true })
  })

  it('should store forever without expiration', async () => {
    const foreverKey = 'forever-key'
    const foreverResult = await cache.forever(foreverKey, { forever: true })

    expect(foreverResult).toEqual({ forever: true })

    const getResult = await cache.get(foreverKey)
    expect(getResult).toEqual({ forever: true })
  })

  it('should store and delete', async () => {
    const deleteKey = 'delete-key'
    const deleteResult = await cache.set(deleteKey, 'delete', 3600)
    expect(deleteResult).toBe('OK')

    await cache.delete(deleteKey)
    const deletedResult = await cache.get(deleteKey)
    expect(deletedResult).toBeNull()
  })

  it('should store and flash', async () => {
    const flashKey = 'flash-key'
    const flashResult = await cache.set(flashKey, 'flash', 3600)
    expect(flashResult).toBe('OK')

    await cache.flush()
    const deletedResult = await cache.get(flashResult)
    expect(deletedResult).toBeNull()
  })
})
