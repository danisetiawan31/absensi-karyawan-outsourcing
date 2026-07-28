-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('PERUBAHAN_JADWAL', 'REMINDER_CHECKIN', 'ALERT_SUPERVISOR');

-- AlterEnum
ALTER TYPE "StatusIzin" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "statusAktif" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "statusAktif" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipe" "TipeNotifikasi" NOT NULL,
    "pesan" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
