import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/audit-report-worker")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const callback = request.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!callback || !/^[a-f0-9-]{72}$/.test(callback)) return new Response("Unauthorized", { status: 401 });
    const body = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
    if (!body.success) return new Response("Invalid request", { status: 400 });
    const { processAuditReportJob } = await import("@/lib/audit-report-job.server");
    const accepted = await processAuditReportJob(body.data.id, callback);
    return Response.json({ accepted }, { status: accepted ? 200 : 403 });
  } } },
});