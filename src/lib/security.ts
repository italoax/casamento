/**
 * Utilitários centralizados de segurança
 * Classe principal para proteção contra vulnerabilidades comuns
 */

import * as crypto from 'crypto';

export class Security {
  private static rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  private static lastSweepAt = 0;
  private static readonly SWEEP_INTERVAL_MS = 60_000;

  /**
   * Remove entradas expiradas do mapa de rate limit.
   * Sem isto o mapa cresce indefinidamente (uma entrada por IP/rota nunca
   * reutilizada permaneceria para sempre). Roda no máximo a cada 60s.
   */
  private static sweepExpired(now: number): void {
    if (now - this.lastSweepAt < this.SWEEP_INTERVAL_MS) return;
    this.lastSweepAt = now;
    for (const [key, entry] of this.rateLimitMap) {
      if (entry.resetAt < now) this.rateLimitMap.delete(key);
    }
  }

  /**
   * Rate limiting simples em memória
   * Bloqueador de requisições após limite dentro de uma janela de tempo
   */
  static checkRateLimit(
    key: string,
    limit: number = 10,
    windowSeconds: number = 60
  ): boolean {
    const now = Date.now();
    this.sweepExpired(now);
    const entry = this.rateLimitMap.get(key);

    // Expirar entrada antiga
    if (!entry || entry.resetAt < now) {
      this.rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }

    // Verificar limite
    if (entry.count >= limit) return false;

    // Incrementar contador
    entry.count++;
    return true;
  }

  /**
   * Comparação constante-time para tokens
   * Protege contra timing attacks
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * CORS headers seguros
   */
  static allowedOrigins(): string[] {
    return [
      'https://emanuelleitalo.com',
      process.env.BASE_URL || '',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
    ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  }

  static isAllowedOrigin(origin?: string | null, requestUrl?: string | null): boolean {
    // Requisições server-to-server, curl e webhooks normalmente não enviam Origin.
    if (!origin) return true;

    // Permite requisições do mesmo domínio onde o app está rodando, inclusive
    // domínios temporários da Hostinger, sem depender de BASE_URL estar idêntico.
    if (requestUrl) {
      try {
        if (new URL(origin).origin === new URL(requestUrl).origin) return true;
      } catch {
        return false;
      }
    }

    return this.allowedOrigins().includes(origin);
  }

  static corsHeaders(origin?: string | null, requestUrl?: string | null): Record<string, string> {
    const allowedOrigin = origin && this.isAllowedOrigin(origin, requestUrl) ? origin : 'null';

    return {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token, x-efi-webhook-token, efi-access-token',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
  }

  /**
   * Obter IP do cliente com fallback seguro
   */
  static clientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
      const ips = xff.split(',').map(ip => ip.trim());
      return ips[ips.length - 1] || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Gerar token seguro usando crypto
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * HMAC signature para webhooks
   */
  static signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verificar HMAC signature com constant-time
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    return this.constantTimeCompare(signature, expected);
  }

  /**
   * Sanitizar entrada básica
   */
  static sanitizeInput(value: unknown, maxLength: number = 255): string {
    let str = String(value || '').trim();
    str = str.replace(/[\x00-\x1F\x7F]/g, '');
    return str.slice(0, maxLength);
  }
}

/**
 * Logger seguro que não expõe dados sensíveis em produção
 */
export class SafeLog {
  private static sanitizeErrorMessage(message: string): string {
    return message
      .replace(/[A-Z]:\\[^\s)]+/gi, '[path]')
      .replace(/\/[\w./-]+/g, '[path]')
      .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[ip]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
      .replace(/(password|passwd|secret|token|api[_-]?key|access[_-]?token)=([^\s&]+)/gi, '$1=[redacted]');
  }

  static error(context: string, error: unknown) {
    if (process.env.NODE_ENV === 'production') {
      const raw = error instanceof Error ? error.message : String(error);
      console.error(`[${context}] ${this.sanitizeErrorMessage(raw)}`);
    } else {
      console.error(`[${context}]`, error);
    }
  }

  static warn(context: string, message: string) {
    console.warn(`[${context}] ${process.env.NODE_ENV === 'production' ? this.sanitizeErrorMessage(message) : message}`);
  }

  static info(context: string, message: string) {
    console.log(`[${context}] ${process.env.NODE_ENV === 'production' ? this.sanitizeErrorMessage(message) : message}`);
  }
}
