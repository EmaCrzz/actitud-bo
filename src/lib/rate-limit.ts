import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Configuración de Redis
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Fallback para desarrollo local (usar Map en memoria)
const localCache = new Map()

// Rate limiters específicos para diferentes funcionalidades
export const loginRateLimit = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 intentos por minuto
      analytics: true,
    })
  : {
      limit: async (identifier: string) => {
        const key = `login:${identifier}`
        const now = Date.now()
        const windowStart = now - 60000 // 1 minuto
        
        const requests = localCache.get(key) || []
        const validRequests = requests.filter((time: number) => time > windowStart)
        
        if (validRequests.length >= 5) {
          return { success: false, limit: 5, remaining: 0, reset: windowStart + 60000 }
        }
        
        validRequests.push(now)
        localCache.set(key, validRequests)
        
        return { 
          success: true, 
          limit: 5, 
          remaining: 5 - validRequests.length, 
          reset: windowStart + 60000 
        }
      }
    }

export const searchRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 búsquedas por minuto
      analytics: true,
    })
  : {
      limit: async (identifier: string) => {
        const key = `search:${identifier}`
        const now = Date.now()
        const windowStart = now - 60000
        
        const requests = localCache.get(key) || []
        const validRequests = requests.filter((time: number) => time > windowStart)
        
        if (validRequests.length >= 30) {
          return { success: false, limit: 30, remaining: 0, reset: windowStart + 60000 }
        }
        
        validRequests.push(now)
        localCache.set(key, validRequests)
        
        return { 
          success: true, 
          limit: 30, 
          remaining: 30 - validRequests.length, 
          reset: windowStart + 60000 
        }
      }
    }

export const createCustomerRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 clientes por hora
      analytics: true,
    })
  : {
      limit: async (identifier: string) => {
        const key = `create_customer:${identifier}`
        const now = Date.now()
        const windowStart = now - 3600000 // 1 hora
        
        const requests = localCache.get(key) || []
        const validRequests = requests.filter((time: number) => time > windowStart)
        
        if (validRequests.length >= 10) {
          return { success: false, limit: 10, remaining: 0, reset: windowStart + 3600000 }
        }
        
        validRequests.push(now)
        localCache.set(key, validRequests)
        
        return { 
          success: true, 
          limit: 10, 
          remaining: 10 - validRequests.length, 
          reset: windowStart + 3600000 
        }
      }
    }

export const assistanceRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 asistencias por hora
      analytics: true,
    })
  : {
      limit: async (identifier: string) => {
        const key = `assistance:${identifier}`
        const now = Date.now()
        const windowStart = now - 3600000
        
        const requests = localCache.get(key) || []
        const validRequests = requests.filter((time: number) => time > windowStart)
        
        if (validRequests.length >= 20) {
          return { success: false, limit: 20, remaining: 0, reset: windowStart + 3600000 }
        }
        
        validRequests.push(now)
        localCache.set(key, validRequests)
        
        return { 
          success: true, 
          limit: 20, 
          remaining: 20 - validRequests.length, 
          reset: windowStart + 3600000 
        }
      }
    }

// Utility function para obtener IP del request
export const getClientIP = (request: Request): string => {
  // Vercel
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  // Cloudflare
  const realIP = request.headers.get('cf-connecting-ip')

  if (realIP) {
    return realIP
  }
  
  // Otras opciones
  return request.headers.get('x-real-ip') || 
         request.headers.get('x-client-ip') || 
         '127.0.0.1'
}

// Tipos para respuestas de rate limiting
export interface RateLimitResponse {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Error personalizado para rate limiting
export class RateLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public remaining: number,
    public reset: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// Tipos para el wrapper
type RateLimitType = 'login' | 'search' | 'createCustomer' | 'assistance'

// Mapa de rate limiters
const rateLimiters = {
  login: loginRateLimit,
  search: searchRateLimit,
  createCustomer: createCustomerRateLimit,
  assistance: assistanceRateLimit,
}

// Wrapper HOF para aplicar rate limiting a cualquier función
export function withRateLimit<T extends unknown[], R>(
  rateLimitType: RateLimitType,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const identifier = typeof window !== 'undefined' ? 'client' : '127.0.0.1'
    const rateLimit = rateLimiters[rateLimitType]
    
    const { success, limit, remaining, reset } = await rateLimit.limit(identifier)
    
    if (!success) {
      const waitTime = Math.ceil((reset - Date.now()) / 1000)
      const messages = {
        login: `Demasiados intentos de login. Intenta nuevamente en ${waitTime} segundos.`,
        search: `Demasiadas búsquedas. Intenta nuevamente en ${waitTime} segundos.`,
        createCustomer: `Has alcanzado el límite de creación de clientes. Intenta nuevamente en ${Math.ceil(waitTime / 60)} minutos.`,
        assistance: `Has alcanzado el límite de registro de asistencias. Intenta nuevamente en ${Math.ceil(waitTime / 60)} minutos.`,
      }
      
      throw new RateLimitError(
        messages[rateLimitType],
        limit,
        remaining,
        reset
      )
    }
    
    return fn(...args)
  }
}

// Wrapper específico para Next.js API Routes
export function withAPIRateLimit<T extends unknown[], R>(
  rateLimitType: RateLimitType,
  handler: (req: Request, ...args: T) => Promise<R>
) {
  return async (req: Request, ...args: T): Promise<R> => {
    const identifier = getClientIP(req)
    const rateLimit = rateLimiters[rateLimitType]
    
    const { success, limit, remaining, reset } = await rateLimit.limit(identifier)
    
    if (!success) {
      const waitTime = Math.ceil((reset - Date.now()) / 1000)

      throw new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${waitTime} seconds.`,
          retryAfter: waitTime
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': waitTime.toString(),
          },
        }
      )
    }
    
    return handler(req, ...args)
  }
}