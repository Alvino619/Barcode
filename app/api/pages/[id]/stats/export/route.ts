import { resolveStatsRange, dateRangeBounds, csvCell, formatJakartaIso } from "@/server/stats";
import { requireUser } from "@/server/auth";
import { assertCanManagePage } from "@/server/page-access";
import { apiError } from "@/server/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
const BATCH_SIZE = 1000;

export async function GET(request: Request, context: Context) {
  const user = await requireUser();
  try {
    const { id } = await context.params;
    await assertCanManagePage(user, id);
    const search = new URL(request.url).searchParams;
    const range = resolveStatsRange({ range: search.get("range"), from: search.get("from"), to: search.get("to") });
    const { start, end } = dateRangeBounds(range);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`\uFEFF${["scannedAt", "deviceType", "referrer"].map(csvCell).join(",")}\r\n`));
          let cursor: { id: string; scannedAt: Date } | null = null;
          while (!request.signal.aborted) {
            const batch: Array<{ id: string; scannedAt: Date; deviceType: string | null; referrer: string | null }> = await prisma.scanLog.findMany({
              where: {
                pageId: id, scannedAt: { gte: start, lt: end },
                ...(cursor ? { OR: [
                  { scannedAt: { gt: cursor.scannedAt } },
                  { scannedAt: cursor.scannedAt, id: { gt: cursor.id } },
                ] } : {}),
              },
              orderBy: [{ scannedAt: "asc" }, { id: "asc" }], take: BATCH_SIZE,
              select: { id: true, scannedAt: true, deviceType: true, referrer: true },
            });
            if (batch.length === 0) break;
            const body = batch.map((row) => [csvCell(formatJakartaIso(row.scannedAt)), csvCell(row.deviceType), csvCell(row.referrer)].join(",")).join("\r\n");
            controller.enqueue(encoder.encode(`${body}\r\n`));
            const last: (typeof batch)[number] = batch[batch.length - 1];
            cursor = { id: last.id, scannedAt: last.scannedAt };
            if (batch.length < BATCH_SIZE) break;
          }
          controller.close();
        } catch (error) { controller.error(error); }
      },
    });
    return new Response(stream, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scan-${id}-${range.from}-${range.to}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}
