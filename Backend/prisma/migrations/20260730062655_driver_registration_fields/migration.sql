/*
  Warnings:

  - The values [ACTIVE] on the enum `DriverStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[cnic]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[licenseNumber]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cnic` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licenseExpiry` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licenseNumber` to the `Driver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DriverStatus_new" AS ENUM ('IDLE', 'ASSIGNED', 'INACTIVE');
ALTER TABLE "public"."Driver" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Driver" ALTER COLUMN "status" TYPE "DriverStatus_new" USING ("status"::text::"DriverStatus_new");
ALTER TYPE "DriverStatus" RENAME TO "DriverStatus_old";
ALTER TYPE "DriverStatus_new" RENAME TO "DriverStatus";
DROP TYPE "public"."DriverStatus_old";
ALTER TABLE "Driver" ALTER COLUMN "status" SET DEFAULT 'IDLE';
COMMIT;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "cnic" TEXT NOT NULL,
ADD COLUMN     "licenseExpiry" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "licenseNumber" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'IDLE';

-- CreateIndex
CREATE UNIQUE INDEX "Driver_cnic_key" ON "Driver"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_licenseNumber_key" ON "Driver"("licenseNumber");
