import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ID di-force agar karyawan@test.local SELALU punya ID ini,
// berguna kalau ID tsb sudah dipakai/direferensikan di tempat lain
// (mis. hardcoded di test, Postman collection, dsb).
const KARYAWAN1_ID = '02e12f56-3bf9-4a3e-802d-7a9fcb6e7a5d';

function getJakartaTodayStr(now: Date = new Date()): string {
  const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
  const d = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  console.log('Seeding database...');

  const saltRounds = 10;
  const password = await bcrypt.hash('Password123', saltRounds);

  // 1. HR Admin
  await prisma.user.upsert({
    where: { email: 'hr@test.local' },
    update: { passwordHash: password },
    create: {
      nama: 'HR Admin',
      email: 'hr@test.local',
      passwordHash: password,
      role: Role.HR_ADMIN,
      faceEmbedding: [],
    },
  });

  // 2. Supervisor
  const supervisor = await prisma.user.upsert({
    where: { email: 'spv@test.local' },
    update: { passwordHash: password },
    create: {
      nama: 'Supervisor Utama',
      email: 'spv@test.local',
      passwordHash: password,
      role: Role.SUPERVISOR,
      faceEmbedding: [],
    },
  });

  // 3. Karyawan 1 (karyawan@test.local) - ID DI-FORCE
  // Prisma upsert tidak bisa mengganti primary key row yang sudah ada.
  // Jadi kalau ada user dengan email ini tapi ID-nya BEDA dari KARYAWAN1_ID,
  // kita hapus dulu (+ data anak yg terhubung via FK) baru create ulang dgn ID yang benar.
  const existingKaryawan1 = await prisma.user.findUnique({
    where: { email: 'karyawan@test.local' },
  });

  if (existingKaryawan1 && existingKaryawan1.id !== KARYAWAN1_ID) {
    await prisma.logKehadiran.deleteMany({
      where: { karyawanId: existingKaryawan1.id },
    });
    await prisma.jadwalShift.deleteMany({
      where: { karyawanId: existingKaryawan1.id },
    });
    await prisma.user.delete({ where: { id: existingKaryawan1.id } });
  }

  const karyawan1 = await prisma.user.upsert({
    where: { id: KARYAWAN1_ID },
    update: {
      passwordHash: password,
      nama: 'Budi Santoso',
      email: 'karyawan@test.local',
    },
    create: {
      id: KARYAWAN1_ID,
      nama: 'Budi Santoso',
      email: 'karyawan@test.local',
      passwordHash: password,
      role: Role.KARYAWAN,
      faceEmbedding: [0.1, 0.2, 0.3],
    },
  });

  // 4. Karyawan 2 (karyawan@company.com)
  const karyawan2 = await prisma.user.upsert({
    where: { email: 'karyawan@company.com' },
    update: { passwordHash: password, nama: 'Budi Santoso' },
    create: {
      nama: 'Budi Santoso',
      email: 'karyawan@company.com',
      passwordHash: password,
      role: Role.KARYAWAN,
      faceEmbedding: [0.1, 0.2, 0.3],
    },
  });

  // 5. Site Wisma Atlet
  let site = await prisma.site.findFirst({
    where: { nama: 'Wisma Atlet' },
  });
  if (!site) {
    site = await prisma.site.create({
      data: {
        nama: 'Wisma Atlet',
        alamat: 'Kemayoran, Jakarta Pusat',
        latitude: -6.155,
        longitude: 106.862,
        radiusToleransi: 75,
        statusAktif: true,
      },
    });
  }

  // Map supervisor to site
  await prisma.supervisorSite.upsert({
    where: {
      supervisorId_siteId: {
        supervisorId: supervisor.id,
        siteId: site.id,
      },
    },
    update: {},
    create: {
      supervisorId: supervisor.id,
      siteId: site.id,
    },
  });

  // 6. Shift Hari Ini untuk Karyawan (08:00 - 16:00)
  const todayStr = getJakartaTodayStr();
  const tanggalDate = new Date(`${todayStr}T00:00:00+07:00`);
  const jamMulaiDate = new Date(`${todayStr}T08:00:00+07:00`);
  const jamSelesaiDate = new Date(`${todayStr}T16:00:00+07:00`);

  for (const user of [karyawan1, karyawan2]) {
    await prisma.jadwalShift.upsert({
      where: {
        karyawanId_tanggal_jamMulai: {
          karyawanId: user.id,
          tanggal: tanggalDate,
          jamMulai: jamMulaiDate,
        },
      },
      update: {
        jamSelesai: jamSelesaiDate,
        siteId: site.id,
      },
      create: {
        karyawanId: user.id,
        siteId: site.id,
        tanggal: tanggalDate,
        jamMulai: jamMulaiDate,
        jamSelesai: jamSelesaiDate,
      },
    });
  }

  // // 7. Log Kehadiran - Karyawan 1 (test.local): SUDAH_CHECKIN, BELUM checkout
  // // waktuCheckOut & hasilVerifikasiCheckOut sengaja di-null-kan baik di create
  // // MAUPUN update, supaya kalau seed dijalankan ulang setelah user iseng
  // // checkout manual lewat aplikasi, status-nya balik lagi jadi "belum checkout".
  // const jadwalKaryawan1 = await prisma.jadwalShift.findUniqueOrThrow({
  //   where: {
  //     karyawanId_tanggal_jamMulai: {
  //       karyawanId: karyawan1.id,
  //       tanggal: tanggalDate,
  //       jamMulai: jamMulaiDate,
  //     },
  //   },
  // });

  // const checkInKaryawan1 = new Date(`${todayStr}T07:55:00+07:00`);

  // await prisma.logKehadiran.upsert({
  //   where: { jadwalId: jadwalKaryawan1.id },
  //   update: {
  //     waktuCheckIn: checkInKaryawan1,
  //     waktuCheckOut: null,
  //     latitudeCheckIn: site.latitude,
  //     longitudeCheckIn: site.longitude,
  //     latitudeCheckOut: null,
  //     longitudeCheckOut: null,
  //     hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
  //     hasilVerifikasiCheckOut: null,
  //   },
  //   create: {
  //     jadwalId: jadwalKaryawan1.id,
  //     karyawanId: karyawan1.id,
  //     waktuCheckIn: checkInKaryawan1,
  //     latitudeCheckIn: site.latitude,
  //     longitudeCheckIn: site.longitude,
  //     hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
  //   },
  // });

  // // 8. Log Kehadiran - Karyawan 2 (company.com): SELESAI — check-in terlambat, SUDAH checkout
  // const jadwalKaryawan2 = await prisma.jadwalShift.findUniqueOrThrow({
  //   where: {
  //     karyawanId_tanggal_jamMulai: {
  //       karyawanId: karyawan2.id,
  //       tanggal: tanggalDate,
  //       jamMulai: jamMulaiDate,
  //     },
  //   },
  // });

  // const checkInKaryawan2 = new Date(`${todayStr}T08:20:00+07:00`);
  // const checkOutKaryawan2 = new Date(`${todayStr}T16:05:00+07:00`);

  // await prisma.logKehadiran.upsert({
  //   where: { jadwalId: jadwalKaryawan2.id },
  //   update: {
  //     waktuCheckIn: checkInKaryawan2,
  //     waktuCheckOut: checkOutKaryawan2,
  //     latitudeCheckIn: site.latitude,
  //     longitudeCheckIn: site.longitude,
  //     latitudeCheckOut: site.latitude,
  //     longitudeCheckOut: site.longitude,
  //     hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
  //     hasilVerifikasiCheckOut: HasilVerifikasi.VALID,
  //   },
  //   create: {
  //     jadwalId: jadwalKaryawan2.id,
  //     karyawanId: karyawan2.id,
  //     waktuCheckIn: checkInKaryawan2,
  //     waktuCheckOut: checkOutKaryawan2,
  //     latitudeCheckIn: site.latitude,
  //     longitudeCheckIn: site.longitude,
  //     latitudeCheckOut: site.latitude,
  //     longitudeCheckOut: site.longitude,
  //     hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
  //     hasilVerifikasiCheckOut: HasilVerifikasi.VALID,
  //   },
  // });

  console.log(
    `Seeding finished. karyawan@test.local ID = ${karyawan1.id}. Shift schedule for today (${todayStr}) at site ${site.nama}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
