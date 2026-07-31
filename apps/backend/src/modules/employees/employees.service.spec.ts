import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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

describe('EmployeesService - findEmployeeSchedules', () => {
  let service: EmployeesService;
  let prisma: PrismaService;
  const testTrackId = randomUUID();

  let siteId: string;
  let karyawanId: string;
  let supervisorId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Buat site
    const site = await prisma.site.create({
      data: {
        nama: `Site-F2-${testTrackId}`,
        alamat: 'Jl. Test F2',
        latitude: -6.2,
        longitude: 106.8,
      },
    });
    siteId = site.id;

    // Buat karyawan aktif
    const karyawan = await prisma.user.create({
      data: {
        nama: `Karyawan-F2-${testTrackId}`,
        email: `karyawan-f2-${testTrackId}@test.local`,
        passwordHash: 'hash',
        role: Role.KARYAWAN,
        statusAktif: true,
        faceEmbedding: [],
      },
    });
    karyawanId = karyawan.id;

    // Buat supervisor (untuk test 404 - role bukan KARYAWAN)
    const supervisor = await prisma.user.create({
      data: {
        nama: `Supervisor-F2-${testTrackId}`,
        email: `supervisor-f2-${testTrackId}@test.local`,
        passwordHash: 'hash',
        role: Role.SUPERVISOR,
        statusAktif: true,
        faceEmbedding: [],
      },
    });
    supervisorId = supervisor.id;

    // Buat 2 jadwal untuk karyawan
    await prisma.jadwalShift.createMany({
      data: [
        {
          karyawanId,
          siteId,
          tanggal: new Date('2026-09-01T00:00:00+07:00'),
          jamMulai: new Date('2026-09-01T08:00:00+07:00'),
          jamSelesai: new Date('2026-09-01T16:00:00+07:00'),
        },
        {
          karyawanId,
          siteId,
          tanggal: new Date('2026-09-15T00:00:00+07:00'),
          jamMulai: new Date('2026-09-15T08:00:00+07:00'),
          jamSelesai: new Date('2026-09-15T16:00:00+07:00'),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.jadwalShift.deleteMany({
      where: { site: { nama: { contains: testTrackId } } },
    });
    await prisma.site.deleteMany({
      where: { nama: { contains: testTrackId } },
    });
    await prisma.user.deleteMany({
      where: { nama: { contains: testTrackId } },
    });
  });

  it('happy path — karyawan valid dengan jadwal di rentang → return array jadwal', async () => {
    const result = await service.findEmployeeSchedules(
      karyawanId,
      '2026-09-01',
      '2026-09-30',
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty('jadwalId');
    expect(result[0]).toHaveProperty('tanggal');
    expect(result[0]).toHaveProperty('jamMulai');
    expect(result[0]).toHaveProperty('jamSelesai');
    expect(result[0]).toHaveProperty('site');
    expect(result[0].site).toHaveProperty('id');
    expect(result[0].site).toHaveProperty('nama');
  });

  it('tidak ada jadwal di rentang → return [] (bukan error)', async () => {
    const result = await service.findEmployeeSchedules(
      karyawanId,
      '2026-10-01',
      '2026-10-31',
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('karyawanId tidak ditemukan → 404 KARYAWAN_TIDAK_DITEMUKAN', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';
    await expect(
      service.findEmployeeSchedules(fakeId, '2026-09-01', '2026-09-30'),
    ).rejects.toMatchObject({ response: { code: 'KARYAWAN_TIDAK_DITEMUKAN' } });
  });

  it('karyawanId adalah SUPERVISOR (role bukan KARYAWAN) → 404 KARYAWAN_TIDAK_DITEMUKAN', async () => {
    await expect(
      service.findEmployeeSchedules(supervisorId, '2026-09-01', '2026-09-30'),
    ).rejects.toMatchObject({ response: { code: 'KARYAWAN_TIDAK_DITEMUKAN' } });
  });

  it('tanggalMulai > tanggalSelesai → 400 RENTANG_TANGGAL_TIDAK_VALID', async () => {
    await expect(
      service.findEmployeeSchedules(karyawanId, '2026-09-30', '2026-09-01'),
    ).rejects.toMatchObject({
      response: { code: 'RENTANG_TANGGAL_TIDAK_VALID' },
    });
  });

  describe('resetFaceRegistration', () => {
    let testUser: { id: string };

    beforeAll(async () => {
      testUser = await prisma.user.create({
        data: {
          email: `reset-face-${randomUUID()}@test.com`,
          passwordHash: 'hashed',
          nama: `Reset Face Test ${testTrackId}`,
          role: Role.KARYAWAN,
          faceEmbedding: [0.1, 0.2, 0.3],
        },
      });
    });

    it('should reset faceEmbedding to [] and return { success: true } for valid employee', async () => {
      const result = await service.resetFaceRegistration(testUser.id);
      expect(result).toEqual({ success: true });

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.faceEmbedding).toEqual([]);
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      const nonExistentId = randomUUID();
      await expect(
        service.resetFaceRegistration(nonExistentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should succeed idempotently if employee faceEmbedding is already []', async () => {
      const result = await service.resetFaceRegistration(testUser.id);
      expect(result).toEqual({ success: true });

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.faceEmbedding).toEqual([]);
    });
  });
});
