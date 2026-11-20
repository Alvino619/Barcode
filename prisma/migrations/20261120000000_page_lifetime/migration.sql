ALTER TABLE "Page" ADD COLUMN "expiresAt" TIMESTAMPTZ(3);
CREATE INDEX "Page_expiresAt_id_idx" ON "Page"("expiresAt", "id");

ALTER TABLE "UploadedImage" ADD COLUMN "sourcePageId" TEXT,
    ADD COLUMN "deletingAt" TIMESTAMPTZ(3),
    ADD CONSTRAINT "UploadedImage_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "UploadedImage_sourcePageId_idx" ON "UploadedImage"("sourcePageId");
CREATE INDEX "UploadedImage_deletingAt_idx" ON "UploadedImage"("deletingAt");
