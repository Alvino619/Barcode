-- Prisma DateTime values are UTC instants. The old timestamp column stored UTC wall-clock values.
ALTER TABLE "ScanLog"
  ALTER COLUMN "scannedAt" TYPE TIMESTAMPTZ(3)
  USING "scannedAt" AT TIME ZONE 'UTC';
