import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Page + history occupy one slug namespace. Every write takes the same DB lock,
// including upload attachment/cleanup, so separate Node processes cannot race.
export function pageTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7162002)`;
    return work(tx);
  }, { maxWait: 15000, timeout: 20000 });
}
