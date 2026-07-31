import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { HasilVerifikasi, Role, StatusIzin, User, Site } from '@prisma/client';
import { randomUUID } from 'crypto';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  // Test markers for strict scoping
  const trackId = `dash-test-${randomUUID()}`;

  let supervisor1: User;
  let supervisor2: User;
  let karyawan1: User;
  let karyawan2: User;
  let karyawan3: User;
  let karyawan4: User;
  let karyawan5: User;

  let site1: Site;
  let site2: Site;

  const testDate = '2026-09-15';
  const yesterdayStr = '2026-09-14';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [DashboardService],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    // 1. Create Supervisors
    supervisor1 = await prisma.user.create({
      data: {
        email: `sup1-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Supervisor 1',
        role: Role.SUPERVISOR,
      },
    });

    supervisor2 = await prisma.user.create({
      data: {
        email: `sup2-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Supervisor 2 (No Sites)',
        role: Role.SUPERVISOR,
      },
    });

    // 2. Create Employees
    const makeEmp = async (idx: number, nama: string) => {
      return prisma.user.create({
        data: {
          email: `emp${idx}-${trackId}@test.local`,
          passwordHash: 'dummy',
          nama,
          role: Role.KARYAWAN,
        },
      });
    };

    karyawan1 = await makeEmp(1, 'Karyawan Hadir');
    karyawan2 = await makeEmp(2, 'Karyawan Terlambat');
    karyawan3 = await makeEmp(3, 'Karyawan Tidak Hadir');
    karyawan4 = await makeEmp(4, 'Karyawan Izin');
    karyawan5 = await makeEmp(5, 'Karyawan Belum');

    // 3. Create Sites
    site1 = await prisma.site.create({
      data: {
        nama: `Site 1 ${trackId}`,
        alamat: 'Alamat 1',
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    site2 = await prisma.site.create({
      data: {
        nama: `Site 2 Unsupervised ${trackId}`,
        alamat: 'Alamat 2',
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    // 4. Assign Site 1 to Supervisor 1 (Site 2 is NOT assigned to Supervisor 1)
    await prisma.supervisorSite.create({
      data: {
        supervisorId: supervisor1.id,
        siteId: site1.id,
      },
    });
  });

  afterAll(async () => {
    // Scoped cleanup
    await prisma.logKehadiran.deleteMany({
      where: {
        karyawanId: {
          in: [
            karyawan1.id,
            karyawan2.id,
            karyawan3.id,
            karyawan4.id,
            karyawan5.id,
          ],
        },
      },
    });
    await prisma.percobaanAbsensi.deleteMany({
      where: {
        karyawanId: {
          in: [
            karyawan1.id,
            karyawan2.id,
            karyawan3.id,
            karyawan4.id,
            karyawan5.id,
          ],
        },
      },
    });
    await prisma.pengajuanIzin.deleteMany({
      where: {
        karyawanId: {
          in: [
            karyawan1.id,
            karyawan2.id,
            karyawan3.id,
            karyawan4.id,
            karyawan5.id,
          ],
        },
      },
    });
    await prisma.jadwalShift.deleteMany({
      where: { siteId: { in: [site1.id, site2.id] } },
    });
    await prisma.supervisorSite.deleteMany({
      where: { supervisorId: { in: [supervisor1.id, supervisor2.id] } },
    });
    await prisma.site.deleteMany({
      where: { id: { in: [site1.id, site2.id] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            supervisor1.id,
            supervisor2.id,
            karyawan1.id,
            karyawan2.id,
            karyawan3.id,
            karyawan4.id,
            karyawan5.id,
          ],
        },
      },
    });
  });

  it('should return [] if caller has no supervised sites', async () => {
    const result = await service.getAttendanceDashboard(supervisor2.id, {
      tanggal: testDate,
    });
    expect(result).toEqual([]);
  });

  describe('Attendance Status Precedence & Rules', () => {
    let j1Id: string;
    let j2Id: string;
    let j3Id: string;
    let j4Id: string;
    let j5Id: string;
    let jOvernightId: string;
    let jUnsupervisedId: string;

    beforeAll(async () => {
      // 1. Shift 1 (Karyawan 1) - Tepat waktu (08:00, check-in 07:55) -> HADIR
      const jamMulai1 = new Date(`${testDate}T08:00:00+07:00`);
      const j1 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan1.id,
          siteId: site1.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: jamMulai1,
          jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
        },
      });
      j1Id = j1.id;
      await prisma.logKehadiran.create({
        data: {
          jadwalId: j1.id,
          karyawanId: karyawan1.id,
          waktuCheckIn: new Date(`${testDate}T07:55:00+07:00`),
          hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
        },
      });

      // 2. Shift 2 (Karyawan 2) - Telat (08:00, check-in 08:01:00) -> TERLAMBAT
      const j2 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan2.id,
          siteId: site1.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: jamMulai1,
          jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
        },
      });
      j2Id = j2.id;
      await prisma.logKehadiran.create({
        data: {
          jadwalId: j2.id,
          karyawanId: karyawan2.id,
          waktuCheckIn: new Date(`${testDate}T08:01:00+07:00`),
          hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
        },
      });

      // 3. Shift 3 (Karyawan 3) - Cron mark TIDAK_HADIR (meski ada Izin APPROVED) -> TIDAK_HADIR
      const j3 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan3.id,
          siteId: site1.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: jamMulai1,
          jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
        },
      });
      j3Id = j3.id;
      await prisma.logKehadiran.create({
        data: {
          jadwalId: j3.id,
          karyawanId: karyawan3.id,
          waktuCheckIn: null,
          hasilVerifikasiCheckIn: HasilVerifikasi.TIDAK_HADIR,
        },
      });
      // Buat pengajuan izin approved juga untuk karyawan 3
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan3.id,
          jenis: 'SAKIT',
          tanggalMulai: new Date(`${testDate}T00:00:00+07:00`),
          tanggalSelesai: new Date(`${testDate}T00:00:00+07:00`),
          alasan: 'Sakit kronis',
          status: StatusIzin.APPROVED,
        },
      });

      // 4. Shift 4 (Karyawan 4) - Tanpa check-in, tapi punya Izin APPROVED -> IZIN
      const j4 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan4.id,
          siteId: site1.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: jamMulai1,
          jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
        },
      });
      j4Id = j4.id;
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan4.id,
          jenis: 'CUTI',
          tanggalMulai: new Date(`${testDate}T00:00:00+07:00`),
          tanggalSelesai: new Date(`${testDate}T00:00:00+07:00`),
          alasan: 'Cuti tahunan',
          status: StatusIzin.APPROVED,
        },
      });

      // 5. Shift 5 (Karyawan 5) - Tanpa check-in, tanpa izin -> BELUM
      const j5 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan5.id,
          siteId: site1.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: jamMulai1,
          jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
        },
      });
      j5Id = j5.id;

      // 6. Overnight shift (H-1 22:00 s/d testDate 06:00)
      const jOvernight = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan1.id,
          siteId: site1.id,
          tanggal: new Date(`${yesterdayStr}T00:00:00+07:00`),
          jamMulai: new Date(`${yesterdayStr}T22:00:00+07:00`),
          jamSelesai: new Date(`${testDate}T06:00:00+07:00`),
        },
      });
      jOvernightId = jOvernight.id;

      // 7. Shift di Site 2 (Unsupervised by Supervisor 1)
      const jUnsupervised = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan2.id,
          siteId: site2.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: new Date(`${testDate}T17:00:00+07:00`),
          jamSelesai: new Date(`${testDate}T23:00:00+07:00`),
        },
      });
      jUnsupervisedId = jUnsupervised.id;
    });

    afterAll(async () => {
      const createdIds = [
        j1Id,
        j2Id,
        j3Id,
        j4Id,
        j5Id,
        jOvernightId,
        jUnsupervisedId,
      ].filter((id): id is string => typeof id === 'string');

      await prisma.logKehadiran.deleteMany({
        where: {
          jadwalId: {
            in: createdIds,
          },
        },
      });
      await prisma.jadwalShift.deleteMany({
        where: {
          id: {
            in: createdIds,
          },
        },
      });
      await prisma.pengajuanIzin.deleteMany({
        where: { karyawanId: { in: [karyawan3.id, karyawan4.id] } },
      });
    });

    it('should return HADIR for on-time check-in (waktuCheckIn <= jamMulai)', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const item = results.find(
        (r) => r.karyawan === karyawan1.nama && r.status === 'HADIR',
      );
      expect(item).toBeDefined();
      expect(item?.waktuCheckIn).toEqual(
        new Date(`${testDate}T07:55:00+07:00`),
      );
    });

    it('should return TERLAMBAT for late check-in (waktuCheckIn > jamMulai by 1 minute)', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const item = results.find((r) => r.karyawan === karyawan2.nama);
      expect(item).toBeDefined();
      expect(item?.status).toBe('TERLAMBAT');
      expect(item?.waktuCheckIn).toEqual(
        new Date(`${testDate}T08:01:00+07:00`),
      );
    });

    it('should return TIDAK_HADIR for cron-marked absent shift (precedence over approved leave)', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const item = results.find((r) => r.karyawan === karyawan3.nama);
      expect(item).toBeDefined();
      expect(item?.status).toBe('TIDAK_HADIR');
      expect(item?.waktuCheckIn).toBeNull();
    });

    it('should return IZIN when employee has approved leave and no check-in', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const item = results.find((r) => r.karyawan === karyawan4.nama);
      expect(item).toBeDefined();
      expect(item?.status).toBe('IZIN');
      expect(item?.waktuCheckIn).toBeNull();
    });

    it('should return BELUM when employee has no check-in and no approved leave', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const item = results.find((r) => r.karyawan === karyawan5.nama);
      expect(item).toBeDefined();
      expect(item?.status).toBe('BELUM');
      expect(item?.waktuCheckIn).toBeNull();
    });

    it('should include overnight shift starting on H-1 ending on query date', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const overnightItem = results.find(
        (r) => r.karyawan === karyawan1.nama && r.status === 'BELUM',
      );
      expect(overnightItem).toBeDefined();
    });

    it('should exclude shifts from sites not supervised by the caller', async () => {
      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      // Total 6 shifts (jOvernight + j1 + j2 + j3 + j4 + j5), excluding site2 shift
      expect(results.length).toBe(6);

      const siteNames = results.map((r) => r.site);
      expect(siteNames.every((name) => name === site1.nama)).toBe(true);
    });
  });
});
