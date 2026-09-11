-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "GenderPolicy" AS ENUM ('MALE_ONLY', 'FEMALE_ONLY', 'MIXED');

-- CreateEnum
CREATE TYPE "GuestGender" AS ENUM ('MALE', 'FEMALE');

-- RenameColumn: eski erkin matnli "type" (Standard/Deluxe/Suite) endi "category" —
-- yangi "type" maydoni RoomType enumiga (PRIVATE/SHARED) ajratiladi, mavjud
-- ma'lumotlar shu bilan saqlanib qoladi.
ALTER TABLE "Room" RENAME COLUMN "type" TO "category";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "genderPolicy" "GenderPolicy" NOT NULL DEFAULT 'MIXED',
ADD COLUMN     "pricePerBed" DOUBLE PRECISION,
ADD COLUMN     "totalBeds" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "type" "RoomType" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bedsBooked" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "guestGender" "GuestGender";
