-- CreateEnum
CREATE TYPE "RentalMode" AS ENUM ('WITH_DRIVER', 'SELF_DRIVE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dropoffAddress" TEXT,
ADD COLUMN     "dropoffLat" DOUBLE PRECISION,
ADD COLUMN     "dropoffLng" DOUBLE PRECISION,
ADD COLUMN     "outletId" INTEGER,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "rentalMode" "RentalMode";

-- CreateTable
CREATE TABLE "Outlet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addressText" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
