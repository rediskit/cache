export class CacheError extends Error {
  operation: string
  originalError: Error | unknown

  constructor(operation: string, message: string, originalError?: Error | unknown) {
    super(`Cache ${operation} operation failed: ${message}`)
    this.name = 'CacheError'
    this.operation = operation
    this.originalError = originalError || new Error(message)
    Object.setPrototypeOf(this, CacheError.prototype) // for proper inheritance
  }
}
