-- AlterEnum
CREATE TYPE "BookingCancelReason" AS ENUM ('ADMIN', 'EVENT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelReason" "BookingCancelReason",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByEventId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_cancelledByEventId_idx" ON "Booking"("cancelledByEventId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancelledByEventId_fkey" FOREIGN KEY ("cancelledByEventId") REFERENCES "HallEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
