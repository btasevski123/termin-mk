-- Occupancy token used to atomically forbid two active bookings on the same
-- hall + date + startTime. Cancelled rows keep NULL (PostgreSQL UNIQUE allows
-- many NULLs), so a cancelled slot can be booked again.

ALTER TABLE "Booking" ADD COLUMN "activeSlotKey" TEXT;

-- If any duplicate active bookings already exist, keep the earliest and cancel the rest.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "hallId", "date", "startTime"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "Booking"
  WHERE status IN ('PENDING', 'CONFIRMED')
)
UPDATE "Booking" AS b
SET
  status = 'CANCELLED',
  "cancelledAt" = CURRENT_TIMESTAMP,
  "cancelReason" = 'ADMIN',
  "updatedAt" = CURRENT_TIMESTAMP
FROM ranked
WHERE b.id = ranked.id
  AND ranked.rn > 1;

UPDATE "Booking"
SET "activeSlotKey" = "hallId" || ':' || to_char("date", 'YYYY-MM-DD') || ':' || "startTime"
WHERE status IN ('PENDING', 'CONFIRMED');

CREATE UNIQUE INDEX "Booking_activeSlotKey_key" ON "Booking"("activeSlotKey");
