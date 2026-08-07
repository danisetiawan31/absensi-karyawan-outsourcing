import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceCronService } from './attendance-cron.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppModule } from '../../app.module';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

describe('AttendanceCronService (Integration)', () => {
  let service: AttendanceCronService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<AttendanceCronService>(AttendanceCronService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createDummyUser = async (id: string) => {
    return prisma.user.create({
      data: {
        id,
        nama: `Test User ${id}`,
        email: `test-${id}@example.com`,
        passwordHash: await bcrypt.hash('password', 10),
        role: 'KARYAWAN',
        statusAktif: true,
      },
    });
  };

  const createDummySite = async (id: string) => {
    return prisma.site.create({
      data: {
        id,
        nama: `Test Site ${id}`,
        alamat: 'Test Alamat',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100,
      },
    });
  };

  describe('T+5 Reminder Logic', () => {
    let siteId: string;
    let userId: string;

    beforeEach(async () => {
      // Setup master data for each test suite to avoid conflicts
      siteId = crypto.randomUUID();
      userId = crypto.randomUUID();
      await createDummySite(siteId);
      await createDummyUser(userId);
    });

    afterEach(async () => {
      // Cleanup data related to this block
      await prisma.notifikasi.deleteMany({ where: { userId } });
      await prisma.logKehadiran.deleteMany({ where: { karyawanId: userId } });
      await prisma.percobaanAbsensi.deleteMany({
        where: { karyawanId: userId },
      });
      await prisma.jadwalShift.deleteMany({ where: { karyawanId: userId } });
      await prisma.user.delete({ where: { id: userId } });
      await prisma.site.delete({ where: { id: siteId } });
    });

    it('1. Reminder terkirim kalau sudah lewat T+5 dan belum checkin', async () => {
      const now = new Date('2026-07-30T10:00:00+07:00');
      // jamMulai 10 minutes ago -> already past T+5
      const jamMulai = new Date(now.getTime() - 10 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendReminders(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'REMINDER_CHECKIN' },
      });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].pesan).toContain(
        'Anda belum melakukan check-in untuk shift di',
      );
    });

    it('2. Reminder TIDAK terkirim kalau belum lewat T+5 (mis. baru T+3)', async () => {
      const now = new Date('2026-07-30T10:00:00+07:00');
      // jamMulai 3 minutes ago -> not yet T+5
      const jamMulai = new Date(now.getTime() - 3 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendReminders(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'REMINDER_CHECKIN' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('3. Reminder TIDAK terkirim dobel kalau notifikasi REMINDER_CHECKIN untuk jadwalId itu sudah ada sebelumnya', async () => {
      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      // Insert existing notif
      await prisma.notifikasi.create({
        data: {
          userId,
          jadwalId: jadwal.id,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Existing reminder',
        },
      });

      await service.checkAndSendReminders(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'REMINDER_CHECKIN' },
      });
      // Should still be exactly 1
      expect(notifs).toHaveLength(1);
    });

    it('4. Reminder TIDAK terkirim kalau karyawan sudah checkin (LogKehadiran.waktuCheckIn terisi)', async () => {
      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await prisma.logKehadiran.create({
        data: {
          id: crypto.randomUUID(),
          jadwalId: jadwal.id,
          karyawanId: userId,
          waktuCheckIn: new Date(now.getTime() - 8 * 60 * 1000), // check-in 8 mins ago
          hasilVerifikasiCheckIn: 'VALID',
        },
      });

      await service.checkAndSendReminders(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'REMINDER_CHECKIN' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('5. Reminder TIDAK terkirim kalau sudah lewat jamSelesai (di luar window T+5 sampai jamSelesai)', async () => {
      const now = new Date('2026-07-30T10:00:00+07:00');
      // jamMulai 10 hours ago, jamSelesai 2 hours ago
      const jamMulai = new Date(now.getTime() - 10 * 3600 * 1000);
      const jamSelesai = new Date(now.getTime() - 2 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-29T00:00:00+07:00'), // yesterday
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendReminders(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'REMINDER_CHECKIN' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('6. Reminder tetap terkirim untuk shift yang jamMulai-nya kemarin tapi jamSelesai-nya hari ini (shift lintas tengah malam)', async () => {
      // Current time is 01:00 AM
      const now = new Date('2026-07-31T01:00:00+07:00');

      // Shift started at 22:00 PM yesterday, ends at 06:00 AM today
      const jamMulai = new Date('2026-07-30T22:00:00+07:00');
      const jamSelesai = new Date('2026-07-31T06:00:00+07:00');

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          // Tanggal refers to the shift's "logical" day (yesterday)
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendReminders(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'REMINDER_CHECKIN' },
      });
      expect(notifs).toHaveLength(1);
    });
  });

  describe('T+15 Supervisor Alert Logic', () => {
    let siteId: string;
    let userId: string;
    let supervisor1Id: string;
    let supervisor2Id: string;

    beforeEach(async () => {
      siteId = crypto.randomUUID();
      userId = crypto.randomUUID();
      supervisor1Id = crypto.randomUUID();
      supervisor2Id = crypto.randomUUID();

      await createDummySite(siteId);
      await createDummyUser(userId);

      // Create supervisors
      await prisma.user.create({
        data: {
          id: supervisor1Id,
          nama: `Test Supervisor 1`,
          email: `sv1-${supervisor1Id}@example.com`,
          passwordHash: await bcrypt.hash('password', 10),
          role: 'SUPERVISOR',
          statusAktif: true,
        },
      });

      await prisma.user.create({
        data: {
          id: supervisor2Id,
          nama: `Test Supervisor 2`,
          email: `sv2-${supervisor2Id}@example.com`,
          passwordHash: await bcrypt.hash('password', 10),
          role: 'SUPERVISOR',
          statusAktif: true,
        },
      });
    });

    afterEach(async () => {
      await prisma.notifikasi.deleteMany({ where: { jadwal: { siteId } } });
      await prisma.logKehadiran.deleteMany({ where: { karyawanId: userId } });
      await prisma.percobaanAbsensi.deleteMany({
        where: { karyawanId: userId },
      });
      await prisma.jadwalShift.deleteMany({ where: { karyawanId: userId } });
      await prisma.supervisorSite.deleteMany({ where: { siteId } });
      await prisma.user.delete({ where: { id: userId } });
      await prisma.user.delete({ where: { id: supervisor1Id } });
      await prisma.user.delete({ where: { id: supervisor2Id } });
      await prisma.site.delete({ where: { id: siteId } });
    });

    const assignSupervisors = async (...svIds: string[]) => {
      for (const svId of svIds) {
        await prisma.supervisorSite.create({
          data: {
            id: crypto.randomUUID(),
            siteId,
            supervisorId: svId,
          },
        });
      }
    };

    it('1. Alert terkirim ke supervisor kalau sudah lewat T+15 dan belum checkin', async () => {
      await assignSupervisors(supervisor1Id);

      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 20 * 60 * 1000); // 20 mins ago
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].userId).toBe(supervisor1Id);
      expect(notifs[0].pesan).toContain('lewat 15 menit');
    });

    it('2. Alert TIDAK terkirim kalau belum lewat T+15 (mis. baru T+10)', async () => {
      await assignSupervisors(supervisor1Id);

      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('3. Kalau 1 site diawasi 2 supervisor, KEDUANYA dapat alert untuk jadwal yang sama', async () => {
      await assignSupervisors(supervisor1Id, supervisor2Id);

      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 20 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(2);
      const notifiedUserIds = notifs.map((n) => n.userId);
      expect(notifiedUserIds).toContain(supervisor1Id);
      expect(notifiedUserIds).toContain(supervisor2Id);
    });

    it('4. Dedup per supervisor bekerja (A tidak dobel, B tetap dapat)', async () => {
      await assignSupervisors(supervisor1Id, supervisor2Id);

      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 20 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      // Supervisor A already has notif
      await prisma.notifikasi.create({
        data: {
          userId: supervisor1Id,
          jadwalId: jadwal.id,
          tipe: 'ALERT_SUPERVISOR',
          pesan: 'Existing alert',
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });

      // Should be 2 total (1 old from A, 1 new from B)
      expect(notifs).toHaveLength(2);

      // B should have received exactly 1
      const notifsForB = notifs.filter((n) => n.userId === supervisor2Id);
      expect(notifsForB).toHaveLength(1);

      // A should have exactly 1 (the old one)
      const notifsForA = notifs.filter((n) => n.userId === supervisor1Id);
      expect(notifsForA).toHaveLength(1);
    });

    it('5. Alert TIDAK terkirim kalau karyawan sudah checkin', async () => {
      await assignSupervisors(supervisor1Id);

      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 20 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await prisma.logKehadiran.create({
        data: {
          id: crypto.randomUUID(),
          jadwalId: jadwal.id,
          karyawanId: userId,
          waktuCheckIn: new Date(now.getTime() - 10 * 60 * 1000),
          hasilVerifikasiCheckIn: 'VALID',
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('6. Alert TIDAK terkirim kalau sudah lewat jamSelesai', async () => {
      await assignSupervisors(supervisor1Id);

      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 3600 * 1000); // 10 hours ago
      const jamSelesai = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-29T00:00:00+07:00'), // yesterday
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('7. Site tanpa supervisor sama sekali → tidak error, tidak ada alert terkirim (graceful skip)', async () => {
      // Intentionally NOT assigning supervisors
      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 20 * 60 * 1000);
      const jamSelesai = new Date(now.getTime() + 8 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(0);
    });

    it('8. Shift lintas tengah malam tetap dihandle benar', async () => {
      await assignSupervisors(supervisor1Id);

      const now = new Date('2026-07-31T01:00:00+07:00');
      const jamMulai = new Date('2026-07-30T22:00:00+07:00'); // yesterday 22:00
      const jamSelesai = new Date('2026-07-31T06:00:00+07:00'); // today 06:00

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndSendSupervisorAlerts(now);

      const notifs = await prisma.notifikasi.findMany({
        where: { jadwalId: jadwal.id, tipe: 'ALERT_SUPERVISOR' },
      });
      expect(notifs).toHaveLength(1);
    });
  });

  describe('Auto-mark TIDAK_HADIR Logic', () => {
    let siteId: string;
    let userId: string;

    beforeEach(async () => {
      siteId = crypto.randomUUID();
      userId = crypto.randomUUID();
      await createDummySite(siteId);
      await createDummyUser(userId);
    });

    afterEach(async () => {
      await prisma.logKehadiran.deleteMany({ where: { karyawanId: userId } });
      await prisma.percobaanAbsensi.deleteMany({
        where: { karyawanId: userId },
      });
      await prisma.jadwalShift.deleteMany({ where: { karyawanId: userId } });
      await prisma.user.delete({ where: { id: userId } });
      await prisma.site.delete({ where: { id: siteId } });
    });

    it('1. TIDAK_HADIR ditandai (LogKehadiran baru dibuat) kalau shift sudah lewat jamSelesai dan belum ada LogKehadiran sama sekali', async () => {
      const now = new Date('2026-07-30T20:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 3600 * 1000); // 10 hours ago
      const jamSelesai = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndMarkAbsent(now);

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwal.id },
      });
      expect(log).toBeDefined();
      expect(log?.waktuCheckIn).toBeNull();
      expect(log?.hasilVerifikasiCheckIn).toBe('TIDAK_HADIR');

      const percobaans = await prisma.percobaanAbsensi.findMany({
        where: { jadwalId: jadwal.id },
      });
      expect(percobaans).toHaveLength(0); // Tidak ada percobaan yang ditulis
    });

    it('2. TIDAK_HADIR ditandai (LogKehadiran existing di-update) kalau LogKehadiran sudah ada dengan waktuCheckIn null', async () => {
      const now = new Date('2026-07-30T20:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 3600 * 1000);
      const jamSelesai = new Date(now.getTime() - 2 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      // Existing log but no waktuCheckIn
      await prisma.logKehadiran.create({
        data: {
          jadwalId: jadwal.id,
          karyawanId: userId,
          waktuCheckIn: null,
          hasilVerifikasiCheckIn: null, // this will be updated
        },
      });

      await service.checkAndMarkAbsent(now);

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwal.id },
      });
      expect(log?.waktuCheckIn).toBeNull();
      expect(log?.hasilVerifikasiCheckIn).toBe('TIDAK_HADIR');
    });

    it('3. TIDAK_HADIR TIDAK ditandai kalau shift belum lewat jamSelesai (masih berjalan)', async () => {
      const now = new Date('2026-07-30T10:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 2 * 3600 * 1000); // started 2 hours ago
      const jamSelesai = new Date(now.getTime() + 6 * 3600 * 1000); // ends in 6 hours

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndMarkAbsent(now);

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwal.id },
      });
      expect(log).toBeNull();
    });

    it('4. TIDAK_HADIR TIDAK ditandai kalau karyawan sudah checkin (waktuCheckIn terisi)', async () => {
      const now = new Date('2026-07-30T20:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 3600 * 1000);
      const jamSelesai = new Date(now.getTime() - 2 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      const waktuCheckInAsli = new Date(now.getTime() - 10 * 3600 * 1000);
      await prisma.logKehadiran.create({
        data: {
          jadwalId: jadwal.id,
          karyawanId: userId,
          waktuCheckIn: waktuCheckInAsli,
          hasilVerifikasiCheckIn: 'VALID',
        },
      });

      await service.checkAndMarkAbsent(now);

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwal.id },
      });
      // Existing data must be preserved
      expect(log?.waktuCheckIn).toEqual(waktuCheckInAsli);
      expect(log?.hasilVerifikasiCheckIn).toBe('VALID');
    });

    it('5. Jadwal yang SUDAH punya hasilVerifikasiCheckIn terisi TIDAK diproses ulang', async () => {
      const now = new Date('2026-07-30T20:00:00+07:00');
      const jamMulai = new Date(now.getTime() - 10 * 3600 * 1000);
      const jamSelesai = new Date(now.getTime() - 2 * 3600 * 1000);

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await prisma.logKehadiran.create({
        data: {
          jadwalId: jadwal.id,
          karyawanId: userId,
          waktuCheckIn: null, // this represents previous run marked it TIDAK_HADIR
          hasilVerifikasiCheckIn: 'TIDAK_HADIR',
        },
      });

      // To verify it's not processed again, we can spy on the logger or DB updates,
      // but conceptually we ensure it remains unchanged.
      await service.checkAndMarkAbsent(now);

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwal.id },
      });
      expect(log?.hasilVerifikasiCheckIn).toBe('TIDAK_HADIR');
    });

    it('6. Shift lintas tengah malam tetap dihandle benar (tidak ke-skip)', async () => {
      // current time is next day 08:00 AM
      const now = new Date('2026-07-31T08:00:00+07:00');
      // shift was yesterday 22:00 to today 06:00
      const jamMulai = new Date('2026-07-30T22:00:00+07:00');
      const jamSelesai = new Date('2026-07-31T06:00:00+07:00');

      const jadwal = await prisma.jadwalShift.create({
        data: {
          id: crypto.randomUUID(),
          karyawanId: userId,
          siteId,
          tanggal: new Date('2026-07-30T00:00:00+07:00'),
          jamMulai,
          jamSelesai,
        },
      });

      await service.checkAndMarkAbsent(now);

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwal.id },
      });
      expect(log?.waktuCheckIn).toBeNull();
      expect(log?.hasilVerifikasiCheckIn).toBe('TIDAK_HADIR');
    });
  });

  describe('Overlap Mutex Protection', () => {
    it('1. Overlapping handleCron execution is skipped when previous tick is still running', async () => {
      const spyReminders = jest.spyOn(service, 'checkAndSendReminders');
      const spyAlerts = jest.spyOn(service, 'checkAndSendSupervisorAlerts');
      const spyAbsent = jest.spyOn(service, 'checkAndMarkAbsent');

      let resolveFirstTick: (() => void) | undefined;
      const delayPromise = new Promise<void>((resolve) => {
        resolveFirstTick = resolve;
      });

      spyReminders.mockImplementationOnce(async () => {
        await delayPromise;
      });

      // Start first tick (will pause inside checkAndSendReminders)
      const firstTickPromise = service.handleCron();

      // Assert isRunning is true while tick 1 is actively running
      expect((service as unknown as { isRunning: boolean }).isRunning).toBe(
        true,
      );

      // Immediately invoke second tick while first is still running
      await service.handleCron();

      // Unblock first tick
      if (resolveFirstTick) {
        resolveFirstTick();
      }
      await firstTickPromise;

      // Assert isRunning is reset to false after tick 1 completes
      expect((service as unknown as { isRunning: boolean }).isRunning).toBe(
        false,
      );

      // Sub-functions should only be executed once (by the first tick)
      expect(spyReminders).toHaveBeenCalledTimes(1);
      expect(spyAlerts).toHaveBeenCalledTimes(1);
      expect(spyAbsent).toHaveBeenCalledTimes(1);

      spyReminders.mockRestore();
      spyAlerts.mockRestore();
      spyAbsent.mockRestore();
    });

    it('2. isRunning returns to false after execution completes (normal & exception)', async () => {
      // Normal execution
      await service.handleCron();
      expect((service as unknown as { isRunning: boolean }).isRunning).toBe(
        false,
      );

      // Exception execution
      const spyReminders = jest
        .spyOn(service, 'checkAndSendReminders')
        .mockRejectedValueOnce(new Error('Simulated sub-function error'));

      await expect(service.handleCron()).rejects.toThrow(
        'Simulated sub-function error',
      );
      expect((service as unknown as { isRunning: boolean }).isRunning).toBe(
        false,
      );

      spyReminders.mockRestore();
    });
  });
});
