-- CreateTable
CREATE TABLE "PageSlugHistory" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageSlugHistory_slug_key" ON "PageSlugHistory"("slug");

-- CreateIndex
CREATE INDEX "PageSlugHistory_pageId_idx" ON "PageSlugHistory"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedImage_key_key" ON "UploadedImage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedImage_url_key" ON "UploadedImage"("url");

-- CreateIndex
CREATE INDEX "UploadedImage_ownerId_createdAt_idx" ON "UploadedImage"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PageSlugHistory" ADD CONSTRAINT "PageSlugHistory_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedImage" ADD CONSTRAINT "UploadedImage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
