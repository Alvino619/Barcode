import "./load-env";
import { prisma } from "@/lib/prisma";
import { prunePages } from "@/server/prune-pages";

async function main() {
  try {
    const { pagesDeleted, pagesFailed, filesDeleted, filesFailed } = await prunePages();
    console.info(`Halaman: ${pagesDeleted} dihapus, ${pagesFailed} gagal. File: ${filesDeleted} dihapus, ${filesFailed} gagal.`);
    if (pagesFailed || filesFailed) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Gagal membersihkan halaman kedaluwarsa.", error);
  process.exitCode = 1;
});
