import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Server } from 'http';
import request from 'supertest';
import {
  Role,
  User,
  Site,
  JadwalShift,
  HasilVerifikasi,
  Prisma,
} from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import { FaceVerificationService } from '../face-verification/face-verification.service';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';
import {
  AttendanceAttemptItem,
  AttendanceSummaryItem,
} from './attendance.service';
import { randomUUID } from 'crypto';

describe('AttendanceController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let faceVerificationService: FaceVerificationService;

  let karyawanUser: User;
  let noFaceUser: User;
  let karyawanToken: string;
  let noFaceToken: string;

  let testSite: Site;
  let jadwalCheckIn: JadwalShift;
  let jadwalCheckOut: JadwalShift;

  let embedFaceSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          return new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Validasi input gagal',
            details: errors,
          });
        },
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    faceVerificationService = app.get<FaceVerificationService>(
      FaceVerificationService,
    );

    // Mock FaceVerificationService
    embedFaceSpy = jest.spyOn(faceVerificationService, 'embedFace');

    // Create unique identifier for this test run's data
    const runId = randomUUID().substring(0, 8);

    // Create Test Site
    testSite = await prisma.site.create({
      data: {
        nama: `Test Site Attendance ${runId}`,
        alamat: 'Jl. Test No. 123',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100, // 100 meters
        statusAktif: true,
      },
    });

    // Create user with face registered
    karyawanUser = await prisma.user.create({
      data: {
        email: `karyawan.attendance.${runId}@test.com`,
        passwordHash: 'hashedpassword',
        nama: 'Karyawan Attendance Test',
        role: Role.KARYAWAN,
        statusAktif: true,
        wajibGantiPassword: false,
        faceEmbedding: [0.1, 0.2, 0.3], // Dummy embedding
      },
    });

    karyawanToken = jwtService.sign({
      userId: karyawanUser.id,
      email: karyawanUser.email,
      role: karyawanUser.role,
    });

    // Create user without face registered
    noFaceUser = await prisma.user.create({
      data: {
        email: `noface.attendance.${runId}@test.com`,
        passwordHash: 'hashedpassword',
        nama: 'Karyawan No Face Test',
        role: Role.KARYAWAN,
        statusAktif: true,
        wajibGantiPassword: false,
        faceEmbedding: [],
      },
    });

    noFaceToken = jwtService.sign({
      userId: noFaceUser.id,
      email: noFaceUser.email,
      role: noFaceUser.role,
    });

    // Create Schedules for testing
    // 1. Jadwal for check-in testing (Active now)
    const now = new Date();
    jadwalCheckIn = await prisma.jadwalShift.create({
      data: {
        karyawanId: karyawanUser.id,
        siteId: testSite.id,
        tanggal: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        jamMulai: new Date(now.getTime() - 1000 * 60 * 60), // Started 1 hour ago
        jamSelesai: new Date(now.getTime() + 1000 * 60 * 60 * 7), // Ends in 7 hours
      },
    });

    // 2. Jadwal for check-out testing (Needs to have a LogKehadiran)
    jadwalCheckOut = await prisma.jadwalShift.create({
      data: {
        karyawanId: karyawanUser.id,
        siteId: testSite.id,
        tanggal: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        jamMulai: new Date(now.getTime() - 1000 * 60 * 60 * 4), // Started 4 hour ago
        jamSelesai: new Date(now.getTime() + 1000 * 60 * 60 * 4), // Ends in 4 hours
      },
    });

    await prisma.logKehadiran.create({
      data: {
        jadwalId: jadwalCheckOut.id,
        karyawanId: karyawanUser.id,
        waktuCheckIn: new Date(now.getTime() - 1000 * 60 * 60 * 4), // Checked in 4 hours ago
        latitudeCheckIn: testSite.latitude,
        longitudeCheckIn: testSite.longitude,
        hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
      },
    });
  });

  afterAll(async () => {
    // Cleanup using unique IDs
    await prisma.logKehadiran.deleteMany({
      where: { karyawanId: { in: [karyawanUser.id, noFaceUser.id] } },
    });
    await prisma.percobaanAbsensi.deleteMany({
      where: { karyawanId: { in: [karyawanUser.id, noFaceUser.id] } },
    });
    await prisma.jadwalShift.deleteMany({
      where: { karyawanId: { in: [karyawanUser.id, noFaceUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [karyawanUser.id, noFaceUser.id] } },
    });
    await prisma.site.delete({
      where: { id: testSite.id },
    });

    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /attendance/check-in', () => {
    it('harus menolak request tanpa file foto', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString());

      expect(response.status).toBe(400);
      const body = response.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FOTO_WAJIB_DIUNGGAH');
    });

    it('harus menolak request dengan file bukan gambar', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('Bukan gambar'), 'test.txt');

      expect(response.status).toBe(400);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('FORMAT_FILE_TIDAK_VALID');
    });

    it('harus mengembalikan WAJAH_BELUM_TERDAFTAR jika faceEmbedding kosong (Precondition)', async () => {
      const noFaceJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: noFaceUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000),
          jamSelesai: new Date(Date.now() + 3600000),
        },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${noFaceToken}`)
        .field('jadwalId', noFaceJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image-data'), 'foto.jpg');

      expect(response.status).toBe(400);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('WAJAH_BELUM_TERDAFTAR');
    });

    it('harus mencatat GAGAL_LOKASI jika latitude/longitude jauh dari site (Haversine)', async () => {
      // Monas coordinates (far from test site which is -6.2, 106.8)
      const latJauh = -6.1754;
      const lonJauh = 106.8272;

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', latJauh.toString())
        .field('longitude', lonJauh.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(200);
      const body = response.body as SuccessEnvelope<{
        hasilVerifikasi: string;
        pesan: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data.hasilVerifikasi).toBe('GAGAL_LOKASI');

      // Check PercobaanAbsensi
      const percobaan = await prisma.percobaanAbsensi.findFirst({
        where: {
          jadwalId: jadwalCheckIn.id,
          hasil: HasilVerifikasi.GAGAL_LOKASI,
        },
      });
      expect(percobaan).toBeDefined();
      expect(percobaan?.tipe).toBe('CHECK_IN');
    });

    it('harus mencatat GAGAL_LIVENESS jika face-service mendeteksi bukan wajah asli', async () => {
      embedFaceSpy.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3], // Match
        liveness: { isLive: false, score: 0.1 },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(200);
      const body = response.body as SuccessEnvelope<{
        hasilVerifikasi: HasilVerifikasi;
        pesan?: string;
      }>;
      expect(body.data.hasilVerifikasi).toBe('GAGAL_LIVENESS');
    });

    it('harus mencatat GAGAL_WAJAH jika cosine similarity di luar threshold', async () => {
      // Mock embedding that is completely different (orthogonal/opposite)
      embedFaceSpy.mockResolvedValueOnce({
        embedding: [-0.9, -0.8, -0.7],
        liveness: { isLive: true, score: 0.99 },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(200);
      const body = response.body as SuccessEnvelope<{
        hasilVerifikasi: HasilVerifikasi;
        pesan?: string;
      }>;
      expect(body.data.hasilVerifikasi).toBe('GAGAL_WAJAH');
    });

    it('harus SUKSES (VALID) melakukan check-in jika semua syarat terpenuhi', async () => {
      // Mock embedding matches perfectly
      embedFaceSpy.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        liveness: { isLive: true, score: 0.99 },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(200);
      const body = response.body as SuccessEnvelope<{
        logId: string;
        waktuCheckIn: string;
        hasilVerifikasi: HasilVerifikasi;
      }>;
      expect(body.success).toBe(true);
      expect(body.data.hasilVerifikasi).toBe('VALID');
      expect(body.data.logId).toBeDefined();
      expect(body.data.waktuCheckIn).toBeDefined();

      // Ensure data written to db
      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwalCheckIn.id },
      });
      expect(log).toBeDefined();
      expect(log?.hasilVerifikasiCheckIn).toBe('VALID');
    });

    it('harus menolak dengan SUDAH_CHECKIN (409) jika melakukan check-in ulang', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckIn.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(409);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('SUDAH_CHECKIN');
    });

    it('harus menolak dengan JADWAL_TIDAK_DITEMUKAN (404) jika jadwalId tidak valid/bukan milik user', async () => {
      const randomId = randomUUID();
      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', randomId)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(404);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('JADWAL_TIDAK_DITEMUKAN');
    });

    it('harus merespons SUDAH_CHECKIN (409) pada kasus race condition (Prisma P2002)', async () => {
      // Create a clean jadwal just for this test
      const raceJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawanUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000),
          jamSelesai: new Date(Date.now() + 3600000),
        },
      });

      embedFaceSpy.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        liveness: { isLive: true, score: 0.99 },
      });

      const transactionSpy = jest
        .spyOn(prisma, '$transaction')
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Duplicate log', {
            code: 'P2002',
            clientVersion: 'x',
          }),
        );

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', raceJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(409);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('SUDAH_CHECKIN');

      transactionSpy.mockRestore();
    });

    it('harus merespons FACE_SERVICE_UNAVAILABLE (503) dan tidak mencatat PercobaanAbsensi jika face-service down', async () => {
      // Create a clean jadwal just for this test
      const svcDownJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawanUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000),
          jamSelesai: new Date(Date.now() + 3600000),
        },
      });

      embedFaceSpy.mockRejectedValueOnce(
        new HttpException(
          {
            code: 'FACE_SERVICE_UNAVAILABLE',
            message: 'Face service down',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );

      const percobaanSebelum = await prisma.percobaanAbsensi.count({
        where: { jadwalId: svcDownJadwal.id },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', svcDownJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(503);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('FACE_SERVICE_UNAVAILABLE');

      const percobaanSesudah = await prisma.percobaanAbsensi.count({
        where: { jadwalId: svcDownJadwal.id },
      });

      expect(percobaanSesudah).toBe(percobaanSebelum);
    });
  });

  describe('POST /attendance/check-out', () => {
    it('harus menolak BELUM_CHECKIN (400) jika jadwal belum punya log kehadiran', async () => {
      // Create new clean jadwal
      const cleanJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawanUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000),
          jamSelesai: new Date(Date.now() + 3600000),
        },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', cleanJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(400);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('BELUM_CHECKIN');
    });

    it('harus SUKSES (VALID) check-out jika sebelumnya sudah check-in dan syarat terpenuhi', async () => {
      embedFaceSpy.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        liveness: { isLive: true, score: 0.99 },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckOut.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(200);
      const body = response.body as SuccessEnvelope<{
        logId: string;
        waktuCheckOut: string;
        hasilVerifikasi: HasilVerifikasi;
      }>;
      expect(body.success).toBe(true);
      expect(body.data.hasilVerifikasi).toBe('VALID');
      expect(body.data.waktuCheckOut).toBeDefined();

      const log = await prisma.logKehadiran.findUnique({
        where: { jadwalId: jadwalCheckOut.id },
      });
      expect(log?.hasilVerifikasiCheckOut).toBe('VALID');
      expect(log?.waktuCheckOut).not.toBeNull();
    });

    it('harus menolak dengan SUDAH_CHECKOUT (409) jika melakukan check-out ulang', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', jadwalCheckOut.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(409);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('SUDAH_CHECKOUT');
    });

    it('harus mencatat DI_LUAR_JENDELA_WAKTU jika waktu check-out melebihi batas 4 jam', async () => {
      // Create jadwal where window has passed (> 4 hours after jamSelesai)
      const pastJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawanUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000 * 10), // 10 hours ago
          jamSelesai: new Date(Date.now() - 3600000 * 5), // 5 hours ago (limit is +4 hours)
        },
      });

      await prisma.logKehadiran.create({
        data: {
          jadwalId: pastJadwal.id,
          karyawanId: karyawanUser.id,
          waktuCheckIn: new Date(Date.now() - 3600000 * 10),
          latitudeCheckIn: testSite.latitude,
          longitudeCheckIn: testSite.longitude,
          hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
        },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', pastJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(200);
      const body = response.body as SuccessEnvelope<{
        hasilVerifikasi: HasilVerifikasi;
        pesan?: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data.hasilVerifikasi).toBe('DI_LUAR_JENDELA_WAKTU');

      const percobaan = await prisma.percobaanAbsensi.findFirst({
        where: {
          jadwalId: pastJadwal.id,
          hasil: HasilVerifikasi.DI_LUAR_JENDELA_WAKTU,
        },
      });
      expect(percobaan).toBeDefined();
      expect(percobaan?.tipe).toBe('CHECK_OUT');
    });

    it('harus menolak dengan JADWAL_TIDAK_DITEMUKAN (404) jika jadwalId tidak valid/bukan milik user', async () => {
      const randomId = randomUUID();
      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', randomId)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(404);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('JADWAL_TIDAK_DITEMUKAN');
    });

    it('harus merespons SUDAH_CHECKOUT (409) pada kasus race condition (updateMany return count: 0)', async () => {
      // Create a clean jadwal just for this test
      const raceJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawanUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000),
          jamSelesai: new Date(Date.now() + 3600000),
        },
      });
      await prisma.logKehadiran.create({
        data: {
          jadwalId: raceJadwal.id,
          karyawanId: karyawanUser.id,
          waktuCheckIn: new Date(Date.now() - 3600000),
          latitudeCheckIn: testSite.latitude,
          longitudeCheckIn: testSite.longitude,
          hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
        },
      });

      embedFaceSpy.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        liveness: { isLive: true, score: 0.99 },
      });

      const transactionSpy = jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([{ count: 0 }, { id: 'fake-percobaan' }]);

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', raceJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(409);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('SUDAH_CHECKOUT');

      transactionSpy.mockRestore();
    });

    it('harus merespons FACE_SERVICE_UNAVAILABLE (503) dan tidak mencatat PercobaanAbsensi jika face-service down (check-out)', async () => {
      // Create a clean jadwal just for this test
      const svcDownJadwal = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawanUser.id,
          siteId: testSite.id,
          tanggal: new Date(),
          jamMulai: new Date(Date.now() - 3600000),
          jamSelesai: new Date(Date.now() + 3600000),
        },
      });
      await prisma.logKehadiran.create({
        data: {
          jadwalId: svcDownJadwal.id,
          karyawanId: karyawanUser.id,
          waktuCheckIn: new Date(Date.now() - 3600000),
          latitudeCheckIn: testSite.latitude,
          longitudeCheckIn: testSite.longitude,
          hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
        },
      });

      embedFaceSpy.mockRejectedValueOnce(
        new HttpException(
          {
            code: 'FACE_SERVICE_UNAVAILABLE',
            message: 'Face service down',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );

      const percobaanSebelum = await prisma.percobaanAbsensi.count({
        where: { jadwalId: svcDownJadwal.id },
      });

      const response = await request(app.getHttpServer() as Server)
        .post('/attendance/check-out')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .field('jadwalId', svcDownJadwal.id)
        .field('latitude', testSite.latitude.toString())
        .field('longitude', testSite.longitude.toString())
        .attach('foto', Buffer.from('fake-image'), 'foto.jpg');

      expect(response.status).toBe(503);
      const body = response.body as ErrorEnvelope;
      expect(body.error.code).toBe('FACE_SERVICE_UNAVAILABLE');

      const percobaanSesudah = await prisma.percobaanAbsensi.count({
        where: { jadwalId: svcDownJadwal.id },
      });

      expect(percobaanSesudah).toBe(percobaanSebelum);
    });
  });

  describe('GET /attendance/attempts', () => {
    let hrUser: User;
    let supervisorUser: User;
    let hrToken: string;
    let supervisorToken: string;

    beforeAll(async () => {
      hrUser = await prisma.user.create({
        data: {
          email: `hr-att-ctrl-${randomUUID()}@test.com`,
          passwordHash: 'hashed',
          nama: 'HR Admin Test',
          role: Role.HR_ADMIN,
        },
      });
      hrToken = jwtService.sign({
        userId: hrUser.id,
        email: hrUser.email,
        role: hrUser.role,
      });

      supervisorUser = await prisma.user.create({
        data: {
          email: `sup-att-ctrl-${randomUUID()}@test.com`,
          passwordHash: 'hashed',
          nama: 'Supervisor Test',
          role: Role.SUPERVISOR,
        },
      });
      supervisorToken = jwtService.sign({
        userId: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { id: { in: [hrUser.id, supervisorUser.id] } },
      });
    });

    it('should return 401 if request has no token', async () => {
      const res = await request(app.getHttpServer() as Server).get(
        `/attendance/attempts?karyawanId=${karyawanUser.id}&periodeMulai=2026-12-01&periodeSelesai=2026-12-05`,
      );

      expect(res.status).toBe(401);
    });

    it('should return 403 if caller role is KARYAWAN', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          `/attendance/attempts?karyawanId=${karyawanUser.id}&periodeMulai=2026-12-01&periodeSelesai=2026-12-05`,
        )
        .set('Authorization', `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if caller role is SUPERVISOR', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          `/attendance/attempts?karyawanId=${karyawanUser.id}&periodeMulai=2026-12-01&periodeSelesai=2026-12-05`,
        )
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 if karyawanId is not a valid UUID', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          '/attendance/attempts?karyawanId=not-a-uuid&periodeMulai=2026-12-01&periodeSelesai=2026-12-05',
        )
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 400 if tanggal format is invalid', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          `/attendance/attempts?karyawanId=${karyawanUser.id}&periodeMulai=01-12-2026&periodeSelesai=2026-12-05`,
        )
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 200 with raw array of attempts for HR_ADMIN', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          `/attendance/attempts?karyawanId=${karyawanUser.id}&periodeMulai=2026-12-01&periodeSelesai=2026-12-05`,
        )
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AttendanceAttemptItem[]>;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /attendance/summary', () => {
    let hrUser: User;
    let supervisorUser: User;
    let hrToken: string;
    let supervisorToken: string;

    beforeAll(async () => {
      hrUser = await prisma.user.create({
        data: {
          id: '00000000-0000-0000-0099-000000000001',
          nama: 'HR Summary Test',
          email: 'hr-summary-test@test.local',
          passwordHash: 'x',
          role: Role.HR_ADMIN,
        },
      });

      supervisorUser = await prisma.user.create({
        data: {
          id: '00000000-0000-0000-0099-000000000002',
          nama: 'Supervisor Summary Test',
          email: 'supervisor-summary-test@test.local',
          passwordHash: 'x',
          role: Role.SUPERVISOR,
        },
      });

      hrToken = jwtService.sign({
        userId: hrUser.id,
        email: hrUser.email,
        role: hrUser.role,
      });

      supervisorToken = jwtService.sign({
        userId: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { id: { in: [hrUser.id, supervisorUser.id] } },
      });
    });

    it('should return 401 if request has no token', async () => {
      const res = await request(app.getHttpServer() as Server).get(
        '/attendance/summary?periodeMulai=2026-12-01&periodeSelesai=2026-12-31',
      );

      expect(res.status).toBe(401);
    });

    it('should return 403 if caller role is KARYAWAN', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          '/attendance/summary?periodeMulai=2026-12-01&periodeSelesai=2026-12-31',
        )
        .set('Authorization', `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if caller role is SUPERVISOR', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          '/attendance/summary?periodeMulai=2026-12-01&periodeSelesai=2026-12-31',
        )
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 if tanggal format is invalid', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          '/attendance/summary?periodeMulai=01-12-2026&periodeSelesai=2026-12-31',
        )
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 200 with raw array of summary for HR_ADMIN', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get(
          '/attendance/summary?periodeMulai=2026-12-01&periodeSelesai=2026-12-31',
        )
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AttendanceSummaryItem[]>;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
