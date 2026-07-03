-- CreateTable
CREATE TABLE "VgrTopic" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VgrTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VgrTopic_organizationId_sortOrder_idx" ON "VgrTopic"("organizationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "VgrTopic" ADD CONSTRAINT "VgrTopic_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

