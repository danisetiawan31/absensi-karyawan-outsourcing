import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { HasilVerifikasi, Role, StatusIzin, User, Site } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CacheService } from '../../common/cache/cache.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(undefined),
  };

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
      providers: [
        DashboardService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
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

  describe('getUnfilledShifts', () => {
    const ufDate = '2026-10-10';
    const ufYesterdayStr = '2026-10-09';
    let u1Id: string;
    let u2Id: string;
    let u3Id: string;
    let u4Id: string;
    let u5Id: string;
    let uOvernightId: string;
    let uUnsupervisedId: string;

    beforeAll(async () => {
      // 1. Shift 1 (Karyawan 1): 08:00 - 16:00 (Akan ditest pada jam 08:10 -> belum T+15)
      const u1 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan1.id,
          siteId: site1.id,
          tanggal: new Date(`${ufDate}T00:00:00+07:00`),
          jamMulai: new Date(`${ufDate}T08:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T16:00:00+07:00`),
        },
      });
      u1Id = u1.id;

      // 2. Shift 2 (Karyawan 2): 08:00 - 16:00 (Ditest pada jam 08:20 -> T+20, belum checkin -> UNFILLED, menitTerlambat=20)
      const u2 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan2.id,
          siteId: site1.id,
          tanggal: new Date(`${ufDate}T00:00:00+07:00`),
          jamMulai: new Date(`${ufDate}T08:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T16:00:00+07:00`),
        },
      });
      u2Id = u2.id;

      // 3. Shift 3 (Karyawan 3): 08:00 - 16:00. Punya log checkin (08:16:00) -> EXCLUDE (sudah checkin)
      const u3 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan3.id,
          siteId: site1.id,
          tanggal: new Date(`${ufDate}T00:00:00+07:00`),
          jamMulai: new Date(`${ufDate}T08:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T16:00:00+07:00`),
        },
      });
      u3Id = u3.id;
      await prisma.logKehadiran.create({
        data: {
          jadwalId: u3.id,
          karyawanId: karyawan3.id,
          waktuCheckIn: new Date(`${ufDate}T08:16:00+07:00`),
          hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
        },
      });

      // 4. Shift 4 (Karyawan 4): 08:00 - 16:00. Punya PengajuanIzin APPROVED -> EXCLUDE
      const u4 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan4.id,
          siteId: site1.id,
          tanggal: new Date(`${ufDate}T00:00:00+07:00`),
          jamMulai: new Date(`${ufDate}T08:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T16:00:00+07:00`),
        },
      });
      u4Id = u4.id;
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan4.id,
          jenis: 'CUTI',
          tanggalMulai: new Date(`${ufDate}T00:00:00+07:00`),
          tanggalSelesai: new Date(`${ufDate}T00:00:00+07:00`),
          alasan: 'Cuti Pribadi',
          status: StatusIzin.APPROVED,
        },
      });

      // 5. Shift 5 (Karyawan 5): 06:00 - 08:00. Ditest pada jam 08:20 (sudah lewat jamSelesai) -> EXCLUDE
      const u5 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan5.id,
          siteId: site1.id,
          tanggal: new Date(`${ufDate}T00:00:00+07:00`),
          jamMulai: new Date(`${ufDate}T06:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T08:00:00+07:00`),
        },
      });
      u5Id = u5.id;

      // 6. Overnight Shift (Karyawan 1): Kemarin 22:00 s/d Hari ini 09:00. Ditest pada jam 08:20 -> UNFILLED
      const uOvernight = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan1.id,
          siteId: site1.id,
          tanggal: new Date(`${ufYesterdayStr}T00:00:00+07:00`),
          jamMulai: new Date(`${ufYesterdayStr}T22:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T09:00:00+07:00`),
        },
      });
      uOvernightId = uOvernight.id;

      // 7. Unsupervised Site Shift (Karyawan 5): Site 2 -> EXCLUDE
      const uUnsupervised = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan5.id,
          siteId: site2.id,
          tanggal: new Date(`${ufDate}T00:00:00+07:00`),
          jamMulai: new Date(`${ufDate}T08:00:00+07:00`),
          jamSelesai: new Date(`${ufDate}T16:00:00+07:00`),
        },
      });
      uUnsupervisedId = uUnsupervised.id;
    });

    afterAll(async () => {
      const createdIds = [
        u1Id,
        u2Id,
        u3Id,
        u4Id,
        u5Id,
        uOvernightId,
        uUnsupervisedId,
      ].filter((id): id is string => typeof id === 'string');

      await prisma.logKehadiran.deleteMany({
        where: { jadwalId: { in: createdIds } },
      });
      await prisma.jadwalShift.deleteMany({
        where: { id: { in: createdIds } },
      });
      await prisma.pengajuanIzin.deleteMany({
        where: { karyawanId: karyawan4.id },
      });
    });

    it('should return [] for supervisor with no supervised sites', async () => {
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor2.id,
        { tanggal: ufDate },
        now,
      );
      expect(results).toEqual([]);
    });

    it('should exclude shift that has not reached T+15 yet', async () => {
      // 08:10 is only T+10 for 08:00 shift
      const nowEarly = new Date(`${ufDate}T08:10:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        nowEarly,
      );

      const u1Result = results.find((r) => r.jadwalId === u1Id);
      expect(u1Result).toBeUndefined();
    });

    it('should include shift past T+15 without check-in and return accurate menitTerlambat', async () => {
      // 08:20 is T+20 for 08:00 shift -> 20 minutes late
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        now,
      );

      const u2Result = results.find((r) => r.jadwalId === u2Id);
      expect(u2Result).toBeDefined();
      expect(u2Result?.karyawan).toBe(karyawan2.nama);
      expect(u2Result?.site).toBe(site1.nama);
      expect(u2Result?.menitTerlambat).toBe(20);
    });

    it('should exclude shift that has check-in log (even if late)', async () => {
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        now,
      );

      const u3Result = results.find((r) => r.jadwalId === u3Id);
      expect(u3Result).toBeUndefined();
    });

    it('should exclude shift for employee with APPROVED leave', async () => {
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        now,
      );

      const u4Result = results.find((r) => r.jadwalId === u4Id);
      expect(u4Result).toBeUndefined();
    });

    it('should exclude shift that has passed jamSelesai', async () => {
      // 08:20 is after 08:00 (jamSelesai for Shift 5)
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        now,
      );

      const u5Result = results.find((r) => r.jadwalId === u5Id);
      expect(u5Result).toBeUndefined();
    });

    it('should exclude shift from site not supervised by the caller', async () => {
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        now,
      );

      const uUnsupervisedResult = results.find(
        (r) => r.jadwalId === uUnsupervisedId,
      );
      expect(uUnsupervisedResult).toBeUndefined();
    });

    it('should include ongoing overnight shift H-1 past T+15 without check-in', async () => {
      // Overnight shift started yesterday 22:00, ends today 09:00.
      // At today 08:20, now - 22:00 yesterday = 10h 20m = 620 minutes
      const now = new Date(`${ufDate}T08:20:00+07:00`);
      const results = await service.getUnfilledShifts(
        supervisor1.id,
        { tanggal: ufDate },
        now,
      );

      const uOvernightResult = results.find((r) => r.jadwalId === uOvernightId);
      expect(uOvernightResult).toBeDefined();
      expect(uOvernightResult?.karyawan).toBe(karyawan1.nama);
      expect(uOvernightResult?.menitTerlambat).toBe(620);
    });
  });

  describe('getAttendanceDashboard (Redis Caching)', () => {
    let testJadwalId: string;

    beforeAll(async () => {
      const j = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan1.id,
          siteId: site1.id,
          tanggal: new Date(`${testDate}T00:00:00+07:00`),
          jamMulai: new Date(`${testDate}T08:00:00+07:00`),
          jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
        },
      });
      testJadwalId = j.id;
    });

    afterAll(async () => {
      await prisma.jadwalShift.deleteMany({
        where: { id: testJadwalId },
      });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('1. Cache-hit: returns cached data without calling Prisma findMany', async () => {
      const mockCachedData = [
        {
          karyawan: 'Karyawan Cached',
          site: 'Site Cached',
          status: 'HADIR' as const,
          waktuCheckIn: '2026-09-15T07:55:00.000Z',
        },
      ];

      mockCacheService.get.mockResolvedValueOnce(mockCachedData);
      const findManySpy = jest.spyOn(prisma.supervisorSite, 'findMany');

      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `dashboard:attendance:${supervisor1.id}:${testDate}`,
      );
      expect(findManySpy).not.toHaveBeenCalled();
      expect(results).toEqual(mockCachedData);

      findManySpy.mockRestore();
    });

    it('2. Cache-miss: queries Prisma and sets cache with TTL 30 seconds', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);

      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: testDate,
      });

      const expectedKey = `dashboard:attendance:${supervisor1.id}:${testDate}`;
      expect(mockCacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expectedKey,
        results,
        30,
      );

      // Verify each item passed to set is in formatted final shape
      for (const item of results) {
        expect(item).toHaveProperty('karyawan');
        expect(item).toHaveProperty('site');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('waktuCheckIn');
      }
    });

    it('3. Cache-miss early return (no supervised sites): sets [] to cache with TTL 30', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);

      const results = await service.getAttendanceDashboard(supervisor2.id, {
        tanggal: testDate,
      });

      expect(results).toEqual([]);
      const expectedKey = `dashboard:attendance:${supervisor2.id}:${testDate}`;
      expect(mockCacheService.set).toHaveBeenCalledWith(expectedKey, [], 30);
    });

    it('4. Cache-miss early return (no shifts on date): sets [] to cache with TTL 30', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      const futureDate = '2099-01-01';

      const results = await service.getAttendanceDashboard(supervisor1.id, {
        tanggal: futureDate,
      });

      expect(results).toEqual([]);
      const expectedKey = `dashboard:attendance:${supervisor1.id}:${futureDate}`;
      expect(mockCacheService.set).toHaveBeenCalledWith(expectedKey, [], 30);
    });
  });

  describe('invalidateDashboardCache', () => {
    it('should delete cache for all supervisors supervising the site', async () => {
      await service.invalidateDashboardCache(site1.id, testDate);

      expect(mockCacheService.del).toHaveBeenCalledWith(
        `dashboard:attendance:${supervisor1.id}:${testDate}`,
      );
    });

    it('should fail-open gracefully when Prisma query throws an error', async () => {
      const findManySpy = jest
        .spyOn(prisma.supervisorSite, 'findMany')
        .mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        service.invalidateDashboardCache(site1.id, testDate),
      ).resolves.toBeUndefined();

      findManySpy.mockRestore();
    });
  });
});
