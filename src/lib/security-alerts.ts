/**
 * Alertas de Segurança - Notifica admin de tentativas de ataque
 * Integração com email e SMS
 */

import { env, envBool } from './env';
import { SafeLog } from './security';
import { db, queryOne, queryRows } from './db';
import { sendEmail } from './email';

export type SecurityAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityAlertType =
  | 'BRUTE_FORCE_ATTEMPT'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'RATE_LIMIT_ABUSE'
  | 'UNAUTHORIZED_ACCESS'
  | 'PAYMENT_ANOMALY'
  | 'SUSPICIOUS_LOCATION'
  | 'INVALID_WEBHOOK'
  | 'DATA_BREACH_ATTEMPT';

interface SecurityAlert {
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  ip_address: string;
  description: string;
  affected_resource?: string;
  details?: Record<string, unknown>;
  user_id?: string;
}

/**
 * Cria tabela de alertas se não existir
 */
async function ensureAlertsTable() {
  await db()
    .execute(
      `CREATE TABLE IF NOT EXISTS security_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    description TEXT,
    affected_resource VARCHAR(255),
    details JSON,
    user_id VARCHAR(100),
    notified_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    admin_notes TEXT,
    INDEX idx_created_at (created_at),
    INDEX idx_severity (severity),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_ip_address (ip_address)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
    .catch(() => undefined);
}

/**
 * Registra alerta de segurança
 */
export async function createSecurityAlert(alert: SecurityAlert): Promise<number | null> {
  try {
    await ensureAlertsTable();

    const result = await db().execute(
      `INSERT INTO security_alerts (type, severity, ip_address, description, affected_resource, details, user_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [
        alert.type,
        alert.severity,
        alert.ip_address,
        alert.description,
        alert.affected_resource || null,
        alert.details ? JSON.stringify(alert.details) : null,
        alert.user_id || null,
      ]
    );

    const alertId = (result as any).insertId;

    // Enviar notificação se severidade for MEDIUM ou maior
    if (['MEDIUM', 'HIGH', 'CRITICAL'].includes(alert.severity)) {
      await notifyAdminOfAlert(alertId, alert);
    }

    return alertId;
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
    return null;
  }
}

/**
 * Notifica admin sobre alerta de segurança
 */
async function notifyAdminOfAlert(alertId: number, alert: SecurityAlert): Promise<void> {
  try {
    const adminEmail = env('ADMIN_EMAIL', '');
    if (!adminEmail) return;

    const subject = `🚨 Alerta de Segurança: ${alert.type} [${alert.severity}]`;

    const emailBody = `
    <h2>Alerta de Segurança Detectado</h2>
    <p><strong>Severidade:</strong> ${alert.severity}</p>
    <p><strong>Tipo:</strong> ${alert.type}</p>
    <p><strong>IP:</strong> ${alert.ip_address}</p>
    <p><strong>Descrição:</strong> ${alert.description}</p>
    ${alert.affected_resource ? `<p><strong>Recurso Afetado:</strong> ${alert.affected_resource}</p>` : ''}
    ${alert.user_id ? `<p><strong>Usuário:</strong> ${alert.user_id}</p>` : ''}
    
    <hr>
    <p><small>ID do Alerta: ${alertId}</small></p>
    <p><small>Data: ${new Date().toISOString()}</small></p>
    `;

    await sendEmail({
      to: adminEmail,
      userType: 'convite',
      subject,
      html: emailBody,
    }).catch((error) => {
      SafeLog.error('SecurityAlerts', `Falha ao enviar email de alerta: ${error}`);
    });
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
  }
}

/**
 * Deteta tentativa de brute force
 */
export async function detectBruteForce(
  ip: string,
  endpoint: string,
  attemptsThreshold: number = 10,
  windowSeconds: number = 300
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);

    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM audit_logs 
     WHERE ip_address = ? AND endpoint = ? AND status_code IN (401, 403) AND created_at > ?`,
      [ip, endpoint, cutoff.toISOString()]
    );

    const count = (result?.count || 0) as number;

    if (count >= attemptsThreshold) {
      await createSecurityAlert({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        ip_address: ip,
        description: `Detalhadas ${count} tentativas falhadas de autenticação em ${windowSeconds}s`,
        affected_resource: endpoint,
        details: { attempts: count, threshold: attemptsThreshold, window_seconds: windowSeconds },
      });

      return true;
    }

    return false;
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
    return false;
  }
}

/**
 * Deteta anomalia de pagamento (transações muito rápidas)
 */
export async function detectPaymentAnomaly(
  ip: string,
  windowSeconds: number = 60,
  transactionsThreshold: number = 5
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);

    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM audit_logs 
     WHERE ip_address = ? AND event_type = 'PAYMENT_CREATED' AND created_at > ?`,
      [ip, cutoff.toISOString()]
    );

    const count = (result?.count || 0) as number;

    if (count >= transactionsThreshold) {
      await createSecurityAlert({
        type: 'PAYMENT_ANOMALY',
        severity: 'MEDIUM',
        ip_address: ip,
        description: `${count} pagamentos criados em ${windowSeconds}s (possível abuso)`,
        details: { transactions: count, threshold: transactionsThreshold },
      });

      return true;
    }

    return false;
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
    return false;
  }
}

/**
 * Deteta padrão de SQL injection
 */
export async function detectSQLInjectionAttempt(
  ip: string,
  payload: string
): Promise<boolean> {
  // Padrões comuns de SQL injection
  const sqlPatterns = [
    /('|")\s*(OR|AND)\s*('|")?.*?=/i,
    /UNION.*SELECT/i,
    /DROP\s+(TABLE|DATABASE)/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /;.*--/,
    /\/\*/,
    /xp_/i,
    /sp_/i,
  ];

  const detected = sqlPatterns.some((pattern) => pattern.test(payload));

  if (detected) {
    await createSecurityAlert({
      type: 'SQL_INJECTION_ATTEMPT',
      severity: 'CRITICAL',
      ip_address: ip,
      description: 'Possível tentativa de SQL injection detectada',
      details: { payload_preview: payload.substring(0, 100) },
    });

    return true;
  }

  return false;
}

/**
 * Marca alerta como resolvido
 */
export async function resolveAlert(alertId: number, adminNotes: string = ''): Promise<void> {
  try {
    await db().execute(
      `UPDATE security_alerts SET status = 'RESOLVED', resolved_at = NOW(), admin_notes = ? WHERE id = ?`,
      [adminNotes, alertId]
    );

    SafeLog.info('SecurityAlerts', `Alerta ${alertId} marcado como resolvido`);
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
  }
}

/**
 * Buscar alertas abertos
 */
export async function getOpenAlerts(
  limit: number = 50
): Promise<Array<Record<string, unknown>>> {
  try {
    await ensureAlertsTable();

    return (await queryRows(
      `SELECT * FROM security_alerts WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT ?`,
      [limit]
    ).catch(() => [])) as Array<Record<string, unknown>>;
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
    return [];
  }
}

/**
 * Dashboard de segurança - estatísticas
 */
export async function getSecurityStats(
  days: number = 7
): Promise<{
  total_alerts: number;
  open_alerts: number;
  critical_alerts: number;
  by_type: Record<string, number>;
  top_ips: Array<{ ip: string; count: number }>;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM security_alerts WHERE created_at > ?`,
      [startDate.toISOString()]
    );

    const openResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM security_alerts WHERE status = 'OPEN' AND created_at > ?`,
      [startDate.toISOString()]
    );

    const criticalResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM security_alerts WHERE severity = 'CRITICAL' AND created_at > ?`,
      [startDate.toISOString()]
    );

    const byTypeResult = await queryRows<{ type: string; count: number }>(
      `SELECT type, COUNT(*) as count FROM security_alerts WHERE created_at > ? GROUP BY type`,
      [startDate.toISOString()]
    );

    const topIpsResult = await queryRows<{ ip_address: string; count: number }>(
      `SELECT ip_address, COUNT(*) as count FROM security_alerts WHERE created_at > ? GROUP BY ip_address ORDER BY count DESC LIMIT 10`,
      [startDate.toISOString()]
    );

    const byType = Object.fromEntries(
      byTypeResult.map((r) => [r.type, r.count])
    );

    const topIps = topIpsResult.map((r) => ({
      ip: r.ip_address,
      count: r.count,
    }));

    return {
      total_alerts: (totalResult?.count || 0) as number,
      open_alerts: (openResult?.count || 0) as number,
      critical_alerts: (criticalResult?.count || 0) as number,
      by_type: byType,
      top_ips: topIps,
    };
  } catch (error) {
    SafeLog.error('SecurityAlerts', error);
    return {
      total_alerts: 0,
      open_alerts: 0,
      critical_alerts: 0,
      by_type: {},
      top_ips: [],
    };
  }
}

