/**
 * Endpoint de Administração - Dashboard de Segurança
 * Rota: GET /api/admin/security
 * Requer: TOKEN_ADMIN variável de ambiente
 */

import { jwtVerify } from "jose";
import { json, errorJson } from "@/lib/http";
import { Security, SafeLog } from "@/lib/security";
import { env } from "@/lib/env";
import { 
  getOpenAlerts, 
  getSecurityStats, 
  resolveAlert 
} from "@/lib/security-alerts";
import { 
  queryAuditLogs, 
  exportAuditLogsCSV 
} from "@/lib/audit-log";
import { checkRedisHealth } from "@/lib/redis-rate-limit";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(origin, request.url),
  });
}

/**
 * Valida token de admin
 */
function isSecureRequest(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const url = new URL(request.url);
  return url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

async function validateAdminToken(request: Request): Promise<boolean> {
  if (!isSecureRequest(request)) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const jwtSecret = env("ADMIN_JWT_SECRET", "");
  if (bearer && jwtSecret.length >= 32) {
    try {
      await jwtVerify(bearer, new TextEncoder().encode(jwtSecret));
      return true;
    } catch {
      return false;
    }
  }

  // Compatibilidade somente fora de produção, ou se liberado explicitamente.
  if (process.env.NODE_ENV === "production" && env("ALLOW_LEGACY_ADMIN_TOKEN", "false").toLowerCase() !== "true") {
    return false;
  }

  const token = request.headers.get("x-admin-token");
  const expected = env("TOKEN_ADMIN", "");
  if (!token || !expected) return false;
  return Security.constantTimeCompare(token, expected);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  // Validar token admin
  if (!(await validateAdminToken(request))) {
    SafeLog.warn("ADMIN", `Tentativa de acesso não autorizado do IP ${Security.clientIp(request)}`);
    return errorJson("Não autorizado", 403, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "dashboard";

    // Dashboard principal
    if (action === "dashboard") {
      const stats = await getSecurityStats(7);
      const openAlerts = await getOpenAlerts(10);
      const redisHealth = await checkRedisHealth();

      return json(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
          security: {
            stats,
            openAlerts,
          },
          infrastructure: {
            redis: redisHealth,
          },
        },
        200,
        { headers: corsHeaders }
      );
    }

    // Listar logs de auditoria
    if (action === "audit-logs") {
      const days = Number(url.searchParams.get("days")) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await queryAuditLogs({
        startDate,
        limit: 1000,
      });

      return json({ logs, count: logs.length }, 200, { headers: corsHeaders });
    }

    // Exportar logs em CSV
    if (action === "export-audit-logs") {
      const days = Number(url.searchParams.get("days")) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const csv = await exportAuditLogsCSV(startDate, endDate);

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Alertas abertos
    if (action === "open-alerts") {
      const alerts = await getOpenAlerts(100);
      return json({ alerts, count: alerts.length }, 200, { headers: corsHeaders });
    }

    return errorJson("Ação desconhecida", 400, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("ADMIN", error);
    return errorJson("Falha ao processar requisição", 500, { headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  // Validar token admin
  if (!(await validateAdminToken(request))) {
    return errorJson("Não autorizado", 403, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    // Resolver alerta
    if (action === "resolve-alert" && body?.alert_id) {
      const alertId = Number(body.alert_id);
      const notes = String(body.notes || "");

      await resolveAlert(alertId, notes);

      return json({ success: true, message: "Alerta resolvido" }, 200, {
        headers: corsHeaders,
      });
    }

    return errorJson("Ação desconhecida", 400, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("ADMIN", error);
    return errorJson("Falha ao processar requisição", 500, { headers: corsHeaders });
  }
}
