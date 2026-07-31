import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppModule } from '../../app.module';
import { INestApplication } from '@nestjs/common';
import { Role, User, Site, HasilVerifikasi, StatusIzin } from '@prisma/client';
import { randomUUID } from 'crypto';

describe('AttendanceService - getAttendanceSummary', () => {
  let app: INestApplication;
  let service: AttendanceService;
  let prisma: PrismaService;

  const trackId = `att-sum-${randomUUID()}`;

  let emp1: User;
  let emp2: User;
  let empNoShifts: User;
  let site: Site;

  const periodeMulai = '2026-11-01';
  const periodeSelesai = '2026-11-05';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = app.get<AttendanceService>(AttendanceService);
    prisma = app.get<PrismaService>(PrismaService);

    emp1 = await prisma.user.create({
      data: {
        email: `emp1-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Asep Supriatna',
        role: Role.KARYAWAN,
      },
    });

    emp2 = await prisma.user.create({
      data: {
        email: `emp2-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Budi Santoso',
        role: Role.KARYAWAN,
      },
    });

    empNoShifts = await prisma.user.create({
      data: {
        email: `noshift-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Charlie Tanpa Jadwal',
        role: Role.KARYAWAN,
      },
    });

    site = await prisma.site.create({
      data: {
        nama: `Site Summary ${trackId}`,
        alamat: 'Alamat Test',
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    // Setup shifts for emp1 (Asep):
    // Shift 1 (Nov 1): HADIR (08:00 checkin 07:55)
    const j1 = await prisma.jadwalShift.create({
      data: {
        karyawanId: emp1.id,
        siteId: site.id,
        tanggal: new Date('2026-11-01T00:00:00+07:00'),
        jamMulai: new Date('2026-11-01T08:00:00+07:00'),
        jamSelesai: new Date('2026-11-01T16:00:00+07:00'),
      },
    });
    await prisma.logKehadiran.create({
      data: {
        jadwalId: j1.id,
        karyawanId: emp1.id,
        waktuCheckIn: new Date('2026-11-01T07:55:00+07:00'),
        hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
      },
    });

    // Shift 2 (Nov 2): TERLAMBAT (08:00 checkin 08:10)
    const j2 = await prisma.jadwalShift.create({
      data: {
        karyawanId: emp1.id,
        siteId: site.id,
        tanggal: new Date('2026-11-02T00:00:00+07:00'),
        jamMulai: new Date('2026-11-02T08:00:00+07:00'),
        jamSelesai: new Date('2026-11-02T16:00:00+07:00'),
      },
    });
    await prisma.logKehadiran.create({
      data: {
        jadwalId: j2.id,
        karyawanId: emp1.id,
        waktuCheckIn: new Date('2026-11-02T08:10:00+07:00'),
        hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
      },
    });

    // Shift 3 (Nov 3): TIDAK_HADIR (cron marked)
    const j3 = await prisma.jadwalShift.create({
      data: {
        karyawanId: emp1.id,
        siteId: site.id,
        tanggal: new Date('2026-11-03T00:00:00+07:00'),
        jamMulai: new Date('2026-11-03T08:00:00+07:00'),
        jamSelesai: new Date('2026-11-03T16:00:00+07:00'),
      },
    });
    await prisma.logKehadiran.create({
      data: {
        jadwalId: j3.id,
        karyawanId: emp1.id,
        waktuCheckIn: null,
        hasilVerifikasiCheckIn: HasilVerifikasi.TIDAK_HADIR,
      },
    });

    // Shift 4 (Nov 4): IZIN (Approved leave)
    await prisma.jadwalShift.create({
      data: {
        karyawanId: emp1.id,
        siteId: site.id,
        tanggal: new Date('2026-11-04T00:00:00+07:00'),
        jamMulai: new Date('2026-11-04T08:00:00+07:00'),
        jamSelesai: new Date('2026-11-04T16:00:00+07:00'),
      },
    });
    await prisma.pengajuanIzin.create({
      data: {
        karyawanId: emp1.id,
        jenis: 'IZIN',
        tanggalMulai: new Date('2026-11-04T00:00:00+07:00'),
        tanggalSelesai: new Date('2026-11-04T00:00:00+07:00'),
        alasan: 'Urusan Keluarga',
        status: StatusIzin.APPROVED,
      },
    });

    // Setup shifts for emp2 (Budi):
    // Shift 1 (Nov 5): BELUM (Future shift, no check-in, no leave)
    await prisma.jadwalShift.create({
      data: {
        karyawanId: emp2.id,
        siteId: site.id,
        tanggal: new Date('2026-11-05T00:00:00+07:00'),
        jamMulai: new Date('2026-11-05T08:00:00+07:00'),
        jamSelesai: new Date('2026-11-05T16:00:00+07:00'),
      },
    });
  });

  afterAll(async () => {
    await prisma.logKehadiran.deleteMany({
      where: { karyawanId: { in: [emp1.id, emp2.id, empNoShifts.id] } },
    });
    await prisma.jadwalShift.deleteMany({
      where: { karyawanId: { in: [emp1.id, emp2.id, empNoShifts.id] } },
    });
    await prisma.pengajuanIzin.deleteMany({
      where: { karyawanId: { in: [emp1.id, emp2.id, empNoShifts.id] } },
    });
    await prisma.site.deleteMany({ where: { id: site.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [emp1.id, emp2.id, empNoShifts.id] } },
    });
    await app.close();
  });

  it('should aggregate status counts accurately for employees with mixed shift statuses', async () => {
    const summary = await service.getAttendanceSummary({
      periodeMulai,
      periodeSelesai,
    });

    const emp1Summary = summary.find((s) => s.karyawanId === emp1.id);
    expect(emp1Summary).toBeDefined();
    expect(emp1Summary?.nama).toBe(emp1.nama);
    expect(emp1Summary?.totalJadwal).toBe(4);
    expect(emp1Summary?.totalHadir).toBe(1);
    expect(emp1Summary?.totalTerlambat).toBe(1);
    expect(emp1Summary?.totalTidakHadir).toBe(1);
    expect(emp1Summary?.totalIzin).toBe(1);
    expect(emp1Summary?.totalBelum).toBe(0);
  });

  it('should count future shifts without check-in as totalBelum', async () => {
    const summary = await service.getAttendanceSummary({
      periodeMulai,
      periodeSelesai,
    });

    const emp2Summary = summary.find((s) => s.karyawanId === emp2.id);
    expect(emp2Summary).toBeDefined();
    expect(emp2Summary?.totalJadwal).toBe(1);
    expect(emp2Summary?.totalBelum).toBe(1);
    expect(emp2Summary?.totalHadir).toBe(0);
  });

  it('should exclude employees who have zero shifts in the given period', async () => {
    const summary = await service.getAttendanceSummary({
      periodeMulai,
      periodeSelesai,
    });

    const empNoShiftSummary = summary.find(
      (s) => s.karyawanId === empNoShifts.id,
    );
    expect(empNoShiftSummary).toBeUndefined();
  });

  it('should satisfy consistency assertion totalJadwal = totalHadir + totalTerlambat + totalTidakHadir + totalIzin + totalBelum', async () => {
    const summary = await service.getAttendanceSummary({
      periodeMulai,
      periodeSelesai,
    });

    expect(summary.length).toBeGreaterThan(0);

    for (const item of summary) {
      const sumCategories =
        item.totalHadir +
        item.totalTerlambat +
        item.totalTidakHadir +
        item.totalIzin +
        item.totalBelum;

      expect(item.totalJadwal).toBe(sumCategories);
    }
  });

  describe('getAttendanceAttempts', () => {
    const attPeriodeMulai = '2026-12-01';
    const attPeriodeSelesai = '2026-12-05';
    let pValid: string;
    let pGagalLokasi: string;
    let pOutside: string;
    let pEmp2: string;
    let jAttId: string;

    beforeAll(async () => {
      const jAtt = await prisma.jadwalShift.create({
        data: {
          karyawanId: emp1.id,
          siteId: site.id,
          tanggal: new Date('2026-12-01T00:00:00+07:00'),
          jamMulai: new Date('2026-12-01T08:00:00+07:00'),
          jamSelesai: new Date('2026-12-01T16:00:00+07:00'),
        },
      });
      jAttId = jAtt.id;

      // 1. Attempt VALID for emp1 on 2026-12-01T07:55:00+07:00
      const p1 = await prisma.percobaanAbsensi.create({
        data: {
          karyawanId: emp1.id,
          jadwalId: jAtt.id,
          tipe: 'CHECK_IN',
          waktu: new Date('2026-12-01T07:55:00+07:00'),
          latitude: -6.2,
          longitude: 106.8,
          hasil: HasilVerifikasi.VALID,
        },
      });
      pValid = p1.id;

      // 2. Attempt GAGAL_LOKASI for emp1 on 2026-12-02T08:05:00+07:00 (Later time)
      const p2 = await prisma.percobaanAbsensi.create({
        data: {
          karyawanId: emp1.id,
          jadwalId: jAtt.id,
          tipe: 'CHECK_IN',
          waktu: new Date('2026-12-02T08:05:00+07:00'),
          latitude: -6.5,
          longitude: 106.9,
          hasil: HasilVerifikasi.GAGAL_LOKASI,
        },
      });
      pGagalLokasi = p2.id;

      // 3. Attempt outside date range (Nov 30) for emp1
      const p3 = await prisma.percobaanAbsensi.create({
        data: {
          karyawanId: emp1.id,
          jadwalId: jAtt.id,
          tipe: 'CHECK_IN',
          waktu: new Date('2026-11-30T08:00:00+07:00'),
          latitude: -6.2,
          longitude: 106.8,
          hasil: HasilVerifikasi.VALID,
        },
      });
      pOutside = p3.id;

      // 4. Attempt for emp2 (Budi) in date range
      const p4 = await prisma.percobaanAbsensi.create({
        data: {
          karyawanId: emp2.id,
          jadwalId: jAtt.id,
          tipe: 'CHECK_IN',
          waktu: new Date('2026-12-01T08:00:00+07:00'),
          latitude: -6.2,
          longitude: 106.8,
          hasil: HasilVerifikasi.VALID,
        },
      });
      pEmp2 = p4.id;
    });

    afterAll(async () => {
      await prisma.percobaanAbsensi.deleteMany({
        where: { id: { in: [pValid, pGagalLokasi, pOutside, pEmp2] } },
      });
      await prisma.jadwalShift.deleteMany({ where: { id: jAttId } });
    });

    it('should return attempts in date range sorted by waktu ascending (mixed VALID and failed results)', async () => {
      const results = await service.getAttendanceAttempts({
        karyawanId: emp1.id,
        periodeMulai: attPeriodeMulai,
        periodeSelesai: attPeriodeSelesai,
      });

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(pValid);
      expect(results[0].hasil).toBe(HasilVerifikasi.VALID);
      expect(results[1].id).toBe(pGagalLokasi);
      expect(results[1].hasil).toBe(HasilVerifikasi.GAGAL_LOKASI);

      // Verify ascending order
      expect(new Date(results[0].waktu).getTime()).toBeLessThan(
        new Date(results[1].waktu).getTime(),
      );
    });

    it('should exclude attempts outside the date range', async () => {
      const results = await service.getAttendanceAttempts({
        karyawanId: emp1.id,
        periodeMulai: attPeriodeMulai,
        periodeSelesai: attPeriodeSelesai,
      });

      const outsideAttempt = results.find((r) => r.id === pOutside);
      expect(outsideAttempt).toBeUndefined();
    });

    it('should exclude attempts for other employees', async () => {
      const results = await service.getAttendanceAttempts({
        karyawanId: emp1.id,
        periodeMulai: attPeriodeMulai,
        periodeSelesai: attPeriodeSelesai,
      });

      const emp2Attempt = results.find((r) => r.id === pEmp2);
      expect(emp2Attempt).toBeUndefined();
    });

    it('should return [] if employee has no attempts in date range', async () => {
      const results = await service.getAttendanceAttempts({
        karyawanId: empNoShifts.id,
        periodeMulai: attPeriodeMulai,
        periodeSelesai: attPeriodeSelesai,
      });

      expect(results).toEqual([]);
    });
  });
});
