ALTER TABLE "Booking" ADD COLUMN "bookingReference" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" TEXT;

UPDATE "Booking" SET "bookingReference" = 'LEGACY-' || "id", "paymentMethod" = 'CASH' WHERE "bookingReference" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "bookingReference" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "paymentMethod" SET NOT NULL;
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");