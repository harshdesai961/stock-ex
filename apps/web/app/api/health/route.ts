// GET /api/health: liveness probe for the web app (used by uptime monitoring).
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
