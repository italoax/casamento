import { json } from "@/app/api/_middleware/responses";

export const dynamic = "force-dynamic";

/**
 * GET /api/health - Health check
 */
export async function GET() {
  return json({
    ok: true,
    app: "casamento-emanuelle-italo",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
}
