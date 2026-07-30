-- AlterTable
ALTER TABLE "Notifikasi" ADD COLUMN     "jadwalId" TEXT;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "JadwalShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
