import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

async function main() {
  loadEnvConfig(process.cwd());
  const configuredDays = process.env.SCAN_RETENTION_DAYS ?? "365";
  if (!/^\d+$/.test(configuredDays) || Number(configuredDays) < 1 || Number(configuredDays) > 36_500) {
    throw new Error("SCAN_RETENTION_DAYS harus berupa bilangan bulat 1–36500.");
  }
  const retentionDays = Number(configuredDays);
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const prisma = new PrismaClient();
  try {
    const result = await prisma.scanLog.deleteMany({ where: { scannedAt: { lt: cutoff } } });
    console.info(`Retensi scan ${retentionDays} hari: ${result.count.toLocaleString("id-ID")} log dihapus.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Gagal membersihkan log scan lama.", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
