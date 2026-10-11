export const dynamic = "force-dynamic";

export async function GET() {
    return Response.json({ versao: process.env.SITE_BUILD_VERSION || "" }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
    });
}
