-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('HANDBALL', 'THEATER', 'TOURNAMENT', 'OTHER');

-- CreateTable
CREATE TABLE "HallEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "EventKind" NOT NULL DEFAULT 'OTHER',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "hallId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HallEvent_hallId_startDate_endDate_idx" ON "HallEvent"("hallId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "HallEvent" ADD CONSTRAINT "HallEvent_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
