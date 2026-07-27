-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cnic" TEXT;

-- CreateIndex
-- Nullable + unique: Postgres allows multiple NULLs through a unique index,
-- so existing users (created before this change) are unaffected until they
-- add a CNIC via their profile.
CREATE UNIQUE INDEX "User_cnic_key" ON "User"("cnic");
