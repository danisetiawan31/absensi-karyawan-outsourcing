import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  // CATATAN: Ini hanya untuk keperluan dev/testing.
  // Ini BUKAN representasi endpoint /employees yang sesungguhnya.

  const saltRounds = 10;
  const password = await bcrypt.hash('password123', saltRounds);

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

  await prisma.user.upsert({
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

  await prisma.user.upsert({
    where: { email: 'karyawan@test.local' },
    update: { passwordHash: password },
    create: {
      nama: 'Karyawan Reguler',
      email: 'karyawan@test.local',
      passwordHash: password,
      role: Role.KARYAWAN,
      faceEmbedding: [0.1, 0.2, 0.3], // contoh data face embedding
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
