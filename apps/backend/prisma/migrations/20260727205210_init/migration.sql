-- CreateEnum
CREATE TYPE "Role" AS ENUM ('KARYAWAN', 'SUPERVISOR', 'HR_ADMIN');

-- CreateEnum
CREATE TYPE "StatusIzin" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HasilVerifikasi" AS ENUM ('VALID', 'GAGAL_LOKASI', 'GAGAL_WAJAH', 'GAGAL_LIVENESS', 'DI_LUAR_JENDELA_WAKTU', 'TIDAK_HADIR');

-- CreateEnum
CREATE TYPE "TipeAbsensi" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "JenisIzin" AS ENUM ('SAKIT', 'IZIN', 'CUTI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "faceEmbedding" DOUBLE PRECISION[],
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusToleransi" INTEGER NOT NULL DEFAULT 75,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorSite" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "SupervisorSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JadwalShift" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jamMulai" TIMESTAMP(3) NOT NULL,
    "jamSelesai" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JadwalShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanIzin" (
    "id" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "jenis" "JenisIzin" NOT NULL,
    "alasan" TEXT,
    "dokumenPendukungUrl" TEXT,
    "status" "StatusIzin" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengajuanIzin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogKehadiran" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "waktuCheckIn" TIMESTAMP(3),
    "waktuCheckOut" TIMESTAMP(3),
    "latitudeCheckIn" DOUBLE PRECISION,
    "longitudeCheckIn" DOUBLE PRECISION,
    "latitudeCheckOut" DOUBLE PRECISION,
    "longitudeCheckOut" DOUBLE PRECISION,
    "hasilVerifikasiCheckIn" "HasilVerifikasi",
    "hasilVerifikasiCheckOut" "HasilVerifikasi",

    CONSTRAINT "LogKehadiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PercobaanAbsensi" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tipe" "TipeAbsensi" NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "hasil" "HasilVerifikasi" NOT NULL,

    CONSTRAINT "PercobaanAbsensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorSite_supervisorId_siteId_key" ON "SupervisorSite"("supervisorId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "JadwalShift_karyawanId_tanggal_jamMulai_key" ON "JadwalShift"("karyawanId", "tanggal", "jamMulai");

-- CreateIndex
CREATE UNIQUE INDEX "LogKehadiran_jadwalId_key" ON "LogKehadiran"("jadwalId");

-- AddForeignKey
ALTER TABLE "SupervisorSite" ADD CONSTRAINT "SupervisorSite_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorSite" ADD CONSTRAINT "SupervisorSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalShift" ADD CONSTRAINT "JadwalShift_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalShift" ADD CONSTRAINT "JadwalShift_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanIzin" ADD CONSTRAINT "PengajuanIzin_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanIzin" ADD CONSTRAINT "PengajuanIzin_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogKehadiran" ADD CONSTRAINT "LogKehadiran_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "JadwalShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogKehadiran" ADD CONSTRAINT "LogKehadiran_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PercobaanAbsensi" ADD CONSTRAINT "PercobaanAbsensi_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "JadwalShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PercobaanAbsensi" ADD CONSTRAINT "PercobaanAbsensi_karyawanId_fkey" FOREIGN KEY ("karyawanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
