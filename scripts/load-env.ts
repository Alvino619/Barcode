import { loadEnvConfig } from "@next/env";

// Run before importing services that construct the shared Prisma client.
loadEnvConfig(process.cwd());
