/**
 * Rate Limiting com Redis (ou memória com fallback)
 * Escalável para múltiplas instâncias
 */

import { env, envBool } from './env';
import { SafeLog } from './security';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Tentativa de conectar ao Redis se disponível
 * Se falhar, usa memória como fallback (para desenvolvimento)
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function redisRequiredInProduction() {
  return isProduction() && !envBool('ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION', false);
}

function getRedisClient() {
  if (envBool('DISABLE_REDIS', false)) {
    if (redisRequiredInProduction()) {
      throw new Error('Redis não pode ser desabilitado em produção. Configure REDIS_URL ou ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true conscientemente.');
    }
    return null;
  }

  try {
    const redisUrl = env('REDIS_URL', '');
    if (!redisUrl) {
      if (redisRequiredInProduction()) {
        throw new Error('REDIS_URL obrigatório em produção para rate limiting distribuído.');
      }
      return null;
    }

    // Dinâmico para não falhar se redis não estiver instalado
    const Redis = require('redis');
    return Redis.createClient({ url: redisUrl });
  } catch (error) {
    if (redisRequiredInProduction()) throw error;
    SafeLog.warn('RateLimit', 'Redis não disponível, usando fallback em memória');
    return null;
  }
}

let redisClient: any = null;
let memoryFallback = new Map<string, RateLimitEntry>();

/**
 * Inicializa conexão com Redis
 */
async function initRedis() {
  if (redisClient) return;

  const client = getRedisClient();
  if (!client) return;

  try {
    await client.connect();
    redisClient = client;
    SafeLog.info('RateLimit', 'Redis conectado com sucesso');

    // Auto-reconnect
    client.on('error', (err: Error) => {
      SafeLog.warn('RateLimit', `Redis desconectado: ${err.message}`);
      redisClient = null;
    });
  } catch (error) {
    SafeLog.warn('RateLimit', `Falha ao conectar Redis: ${error}`);
    redisClient = null;
  }
}

/**
 * Rate limiting com Redis
 * Usa INCR + EXPIRE para operação atômica
 */
export async function checkRateLimitRedis(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<boolean> {
  try {
    await initRedis();
  } catch (error) {
    SafeLog.error('RateLimit', error);
    if (redisRequiredInProduction()) return false;
    return checkRateLimitMemory(key, limit, windowSeconds);
  }

  if (!redisClient) {
    if (redisRequiredInProduction()) {
      SafeLog.error('RateLimit', 'Redis indisponível em produção; requisição bloqueada pelo rate limit fail-closed');
      return false;
    }
    return checkRateLimitMemory(key, limit, windowSeconds);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / windowSeconds);
    const redisKey = `ratelimit:${key}:${window}`;

    // Incrementar contador
    const count = await redisClient.incr(redisKey);

    // Primeiro acesso nesta janela - definir expiração
    if (count === 1) {
      await redisClient.expire(redisKey, windowSeconds + 1);
    }

    return count <= limit;
  } catch (error) {
    SafeLog.error('RateLimit', error);
    return !redisRequiredInProduction();
  }
}

/**
 * Rate limiting em memória (fallback para desenvolvimento)
 */
function checkRateLimitMemory(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): boolean {
  const now = Date.now();
  const entry = memoryFallback.get(key);

  // Expirar entrada antiga
  if (!entry || entry.resetAt < now) {
    memoryFallback.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  // Verificar limite
  if (entry.count >= limit) return false;

  // Incrementar contador
  entry.count++;
  return true;
}

/**
 * Versão simplificada com fallback automático
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<boolean> {
  return checkRateLimitRedis(key, limit, windowSeconds);
}

/**
 * Reset manual de rate limit (para testes)
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (redisClient) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const window = Math.floor(now / 60);
      const redisKey = `ratelimit:${key}:${window}`;
      await redisClient.del(redisKey);
    } catch (error) {
      SafeLog.error('RateLimit', error);
    }
  } else {
    memoryFallback.delete(key);
  }
}

/**
 * Limpar todos os rate limits (cuidado!)
 */
export async function clearAllRateLimits(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.flushDb();
      SafeLog.info('RateLimit', 'Todos os rate limits foram limpos');
    } catch (error) {
      SafeLog.error('RateLimit', error);
    }
  } else {
    memoryFallback.clear();
  }
}

/**
 * Fechar conexão Redis
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      SafeLog.info('RateLimit', 'Redis desconectado');
    } catch (error) {
      SafeLog.error('RateLimit', error);
    }
  }
}

/**
 * Health check Redis
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  method: 'redis' | 'memory';
  error?: string;
}> {
  await initRedis();

  if (!redisClient) {
    return { connected: false, method: 'memory' };
  }

  try {
    await redisClient.ping();
    return { connected: true, method: 'redis' };
  } catch (error) {
    return {
      connected: false,
      method: 'memory',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
