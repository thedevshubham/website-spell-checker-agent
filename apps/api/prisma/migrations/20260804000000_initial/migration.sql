-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "pagesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "matchedText" TEXT NOT NULL,
    "suggestion" TEXT,
    "context" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'languagetool',
    "ruleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Page_scanId_idx" ON "Page"("scanId");
CREATE UNIQUE INDEX "Page_scanId_url_key" ON "Page"("scanId", "url");
CREATE INDEX "Issue_scanId_idx" ON "Issue"("scanId");
CREATE INDEX "Issue_pageId_idx" ON "Issue"("pageId");
CREATE INDEX "Issue_category_idx" ON "Issue"("category");

ALTER TABLE "Page" ADD CONSTRAINT "Page_scanId_fkey"
FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Issue" ADD CONSTRAINT "Issue_scanId_fkey"
FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Issue" ADD CONSTRAINT "Issue_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
