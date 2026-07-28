const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.jadwalShift.deleteMany();
  await prisma.supervisorSite.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleaned');
}
clean();
