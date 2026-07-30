import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppModule } from '../../app.module';
import { Role, StatusIzin } from '@prisma/client';
import { randomUUID } from 'crypto';

describe('EmployeesService - findAvailableEmployees', () => {
  let service: EmployeesService;
  let prisma: PrismaService;
  const testTrackId = randomUUID(); // For test data cleanup scoping

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup generated data
    await prisma.pengajuanIzin.deleteMany({
      where: { alasan: { contains: testTrackId } },
    });
    await prisma.jadwalShift.deleteMany({
      where: { site: { nama: { contains: testTrackId } } },
    });
    await prisma.supervisorSite.deleteMany({
      where: { site: { nama: { contains: testTrackId } } },
    });
    await prisma.site.deleteMany({
      where: { nama: { contains: testTrackId } },
    });
    await prisma.user.deleteMany({
      where: { nama: { contains: testTrackId } },
    });
  });

  describe('findAvailableEmployees', () => {
    let siteAId: string;
    let siteBId: string;
    let supervisorId: string;
    let hrAdminId: string;

    // Karyawan pool
    let kFree: string; // Available
    let kBusySiteA: string; // Has shift in Site A
    let kBusySiteB: string; // Has shift in Site B
    let kCuti: string; // Approved leave
    let kNonAktif: string; // StatusAktif = false

    const targetDate = '2026-08-01'; // Used for testing
    const startOfDay = new Date(`${targetDate}T00:00:00+07:00`);

    beforeAll(async () => {
      // Create sites
      const siteA = await prisma.site.create({
        data: {
          nama: `Site A - ${testTrackId}`,
          alamat: 'Alamat',
          latitude: 0,
          longitude: 0,
        },
      });
      siteAId = siteA.id;

      const siteB = await prisma.site.create({
        data: {
          nama: `Site B - ${testTrackId}`,
          alamat: 'Alamat',
          latitude: 0,
          longitude: 0,
        },
      });
      siteBId = siteB.id;

      // Create users
      const sup = await prisma.user.create({
        data: {
          nama: `Supervisor - ${testTrackId}`,
          email: `sup-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.SUPERVISOR,
          faceEmbedding: [],
        },
      });
      supervisorId = sup.id;

      const hr = await prisma.user.create({
        data: {
          nama: `HR - ${testTrackId}`,
          email: `hr-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.HR_ADMIN,
          faceEmbedding: [],
        },
      });
      hrAdminId = hr.id;

      // Assign supervisor to Site A ONLY
      await prisma.supervisorSite.create({
        data: { supervisorId, siteId: siteAId },
      });

      // Create Karyawan
      const free = await prisma.user.create({
        data: {
          nama: `KFree - ${testTrackId}`,
          email: `k1-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.KARYAWAN,
          faceEmbedding: [],
        },
      });
      kFree = free.id;

      const busyA = await prisma.user.create({
        data: {
          nama: `KBusyA - ${testTrackId}`,
          email: `k2-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.KARYAWAN,
          faceEmbedding: [],
        },
      });
      kBusySiteA = busyA.id;

      const busyB = await prisma.user.create({
        data: {
          nama: `KBusyB - ${testTrackId}`,
          email: `k3-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.KARYAWAN,
          faceEmbedding: [],
        },
      });
      kBusySiteB = busyB.id;

      const cuti = await prisma.user.create({
        data: {
          nama: `KCuti - ${testTrackId}`,
          email: `k4-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.KARYAWAN,
          faceEmbedding: [],
        },
      });
      kCuti = cuti.id;

      const nonAktif = await prisma.user.create({
        data: {
          nama: `KNonAktif - ${testTrackId}`,
          email: `k5-${testTrackId}@test.com`,
          passwordHash: 'hash',
          role: Role.KARYAWAN,
          statusAktif: false,
          faceEmbedding: [],
        },
      });
      kNonAktif = nonAktif.id;

      // Setup Schedules
      await prisma.jadwalShift.create({
        data: {
          karyawanId: kBusySiteA,
          siteId: siteAId,
          tanggal: startOfDay,
          jamMulai: startOfDay,
          jamSelesai: new Date(startOfDay.getTime() + 8 * 60 * 60 * 1000),
        },
      });

      await prisma.jadwalShift.create({
        data: {
          karyawanId: kBusySiteB,
          siteId: siteBId,
          tanggal: startOfDay,
          jamMulai: startOfDay,
          jamSelesai: new Date(startOfDay.getTime() + 8 * 60 * 60 * 1000),
        },
      });

      // Setup Leave
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: kCuti,
          tanggalMulai: startOfDay,
          tanggalSelesai: startOfDay,
          jenis: 'CUTI',
          alasan: `Cuti - ${testTrackId}`,
          status: StatusIzin.APPROVED,
        },
      });
    });

    it('HR_ADMIN can query any site and get correctly filtered available employees', async () => {
      const result = await service.findAvailableEmployees(targetDate, siteBId, {
        id: hrAdminId,
        role: Role.HR_ADMIN,
      });

      const ids = result.map((r) => r.id);

      expect(ids).toContain(kFree);

      // Karyawan with schedule on this date MUST NOT be included, regardless of site
      expect(ids).not.toContain(kBusySiteA);
      expect(ids).not.toContain(kBusySiteB);

      // Approved leave MUST NOT be included
      expect(ids).not.toContain(kCuti);

      // Non-active MUST NOT be included
      expect(ids).not.toContain(kNonAktif);

      // Other roles MUST NOT be included
      expect(ids).not.toContain(supervisorId);
      expect(ids).not.toContain(hrAdminId);
    });

    it('SUPERVISOR querying supervised site gets available employees', async () => {
      const result = await service.findAvailableEmployees(targetDate, siteAId, {
        id: supervisorId,
        role: Role.SUPERVISOR,
      });

      const ids = result.map((r) => r.id);
      expect(ids).toContain(kFree);
      expect(ids).not.toContain(kBusySiteA);
    });

    it('SUPERVISOR querying UNSUPERVISED site gets empty array silently', async () => {
      const result = await service.findAvailableEmployees(targetDate, siteBId, {
        id: supervisorId,
        role: Role.SUPERVISOR,
      });
      expect(result).toEqual([]); // Site B is not supervised by this supervisor
    });
  });
});
