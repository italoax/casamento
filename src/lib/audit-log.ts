/**
 * Audit Logging - Registra todas as ações sensíveis
 * Compliance com regulamentações (LGPD, SOX, etc)
 */

import { db, queryRows } from './db';
import { SafeLog } from './security';
import { env } from './env';

export type AuditEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_FAILED'
  | 'DATA_ACCESS'
  | 'DATA_MODIFIED'
  | 'SECURITY_ALERT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN'
  | 'UNAUTHORIZED_ACCESS';

interface AuditLog {
  event_type: AuditEventType;
  user_id?: string | number;
  ip_address: string;
  user_agent?: string;
  endpoint: string;
  method: string;
  status_code: number;
  details: Record<string, unknown>;
  error_message?: string;
  request_body_hash?: string; // Hash do corpo para não expor dados sensíveis
}

/**
 * Cria tabela de audit logs se não existir
 */
async function ensureAuditTable() {
  await db()
    .execute(
      `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INT,
    details JSON,
    error_message TEXT,
    request_body_hash VARCHAR(64),
    INDEX idx_created_at (created_at),
    INDEX idx_event_type (event_type),
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_endpoint (endpoint)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
    .catch(() => undefined);
}

/**
 * Registra evento de auditoria
 */
export async function auditLog(log: AuditLog & { request?: Request }): Promise<void> {
  try {
    await ensureAuditTable();

    const {
      event_type,
      user_id,
      ip_address,
      user_agent,
      endpoint,
      method,
      status_code,
      details,
      error_message,
      request_body_hash,
    } = log;

    // Sanitizar para remover dados sensíveis
    const sanitizedDetails = sanitizeDetails(details);

    await db()
      .execute(
        `INSERT INTO audit_logs (event_type, user_id, ip_address, user_agent, endpoint, method, status_code, details, error_message, request_body_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event_type,
          user_id || null,
          ip_address,
          user_agent || null,
          endpoint,
          method,
          status_code,
          JSON.stringify(sanitizedDetails),
          error_message || null,
          request_body_hash || null,
        ]
      )
      .catch(() => undefined);
  } catch (error) {
    SafeLog.error('AuditLog', error);
  }
}

/**
 * Remove dados sensíveis do objeto de detalhes
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'cpf',
    'email',
    'phone',
    'credit_card',
    'card_number',
    'cvv',
    'ssn',
  ];

  const sanitized = { ...details };

  for (const key in sanitized) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '***REDACTED***';
    }
  }

  return sanitized;
}

/**
 * Registra tentativa de autenticação bem-sucedida
 */
export async function auditAuthSuccess(request: Request, userId: string): Promise<void> {
  await auditLog({
    event_type: 'AUTH_SUCCESS',
    user_id: userId,
    ip_address: extractIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    status_code: 200,
    details: { action: 'Autenticação bem-sucedida' },
  });
}

/**
 * Registra tentativa de autenticação falha
 */
export async function auditAuthFailed(request: Request, reason: string): Promise<void> {
  await auditLog({
    event_type: 'AUTH_FAILED',
    ip_address: extractIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    status_code: 401,
    error_message: reason,
    details: { action: 'Falha na autenticação' },
  });
}

/**
 * Registra pagamento criado
 */
export async function auditPaymentCreated(
  request: Request,
  paymentId: string,
  amount: number,
  method: string
): Promise<void> {
  await auditLog({
    event_type: 'PAYMENT_CREATED',
    ip_address: extractIp(request),
    endpoint: '/api/pix',
    method: 'POST',
    status_code: 201,
    details: { payment_id: paymentId, amount, method },
  });
}

/**
 * Registra pagamento aprovado
 */
export async function auditPaymentApproved(paymentId: string, amount: number): Promise<void> {
  await auditLog({
    event_type: 'PAYMENT_APPROVED',
    ip_address: 'system',
    endpoint: '/api/webhook',
    method: 'POST',
    status_code: 200,
    details: { payment_id: paymentId, amount },
  });
}

/**
 * Registra pagamento rejeitado
 */
export async function auditPaymentRejected(
  paymentId: string,
  reason: string
): Promise<void> {
  await auditLog({
    event_type: 'PAYMENT_REJECTED',
    ip_address: 'system',
    endpoint: '/api/webhook',
    method: 'POST',
    status_code: 200,
    error_message: reason,
    details: { payment_id: paymentId },
  });
}

/**
 * Registra alerta de segurança
 */
export async function auditSecurityAlert(
  request: Request,
  alertType: string,
  details: Record<string, unknown>
): Promise<void> {
  await auditLog({
    event_type: 'SECURITY_ALERT',
    ip_address: extractIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    status_code: 403,
    details: { alert_type: alertType, ...details },
  });
}

/**
 * Registra rate limit excedido
 */
export async function auditRateLimitExceeded(request: Request, key: string): Promise<void> {
  await auditLog({
    event_type: 'RATE_LIMIT_EXCEEDED',
    ip_address: extractIp(request),
    endpoint: new URL(request.url).pathname,
    method: request.method,
    status_code: 429,
    details: { rate_limit_key: key },
  });
}

/**
 * Obter IP da requisição
 */
function extractIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map((ip) => ip.trim());
    return ips[ips.length - 1] || 'unknown';
  }
  return 'unknown';
}

/**
 * Buscar logs de auditoria com filtros
 */
export async function queryAuditLogs(filters: {
  event_type?: AuditEventType;
  user_id?: string;
  ip_address?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  await ensureAuditTable();

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];

  if (filters.event_type) {
    query += ' AND event_type = ?';
    params.push(filters.event_type);
  }

  if (filters.user_id) {
    query += ' AND user_id = ?';
    params.push(filters.user_id);
  }

  if (filters.ip_address) {
    query += ' AND ip_address = ?';
    params.push(filters.ip_address);
  }

  if (filters.startDate) {
    query += ' AND created_at >= ?';
    params.push(filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query += ' AND created_at <= ?';
    params.push(filters.endDate.toISOString());
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(filters.limit || 100);

  return (await queryRows(query, params).catch(() => [])) as Array<Record<string, unknown>>;
}

/**
 * Exportar logs para arquivo (CSV)
 */
export async function exportAuditLogsCSV(
  startDate: Date,
  endDate: Date
): Promise<string> {
  const logs = await queryAuditLogs({ startDate, endDate, limit: 10000 });

  if (logs.length === 0) {
    return 'event_type,user_id,ip_address,endpoint,method,status_code,created_at\n';
  }

  const headers = Object.keys(logs[0]);
  const csv = [
    headers.join(','),
    ...logs.map((log) =>
      headers.map((h) => {
        const value = log[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      })
      .join(',')
    ),
  ].join('\n');

  return csv;
}

/**
 * Limpar logs antigos (retenção de dados)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  try {
    const [result] = await db().execute(
      'DELETE FROM audit_logs WHERE created_at < ?',
      [cutoffDate.toISOString()]
    );
    return Number((result as { affectedRows?: number }).affectedRows || 0);
  } catch (error) {
    SafeLog.error('AuditLog', error);
    return 0;
  }
}
