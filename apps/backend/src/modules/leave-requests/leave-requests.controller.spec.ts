import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { Role, User, PengajuanIzin, Site } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import * as fs from 'fs';

describe('LeaveRequestsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let hrAdmin: User;
  let supervisor: User;
  let karyawan: User;

  let writeFileSpy: jest.SpyInstance;
  let mkdirSpy: jest.SpyInstance;

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

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Mock fs
    writeFileSpy = jest
      .spyOn(fs.promises, 'writeFile')
      .mockResolvedValue(undefined);
    mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

    // Seed dummy users
    hrAdmin = await prisma.user.create({
      data: {
        nama: 'HR Admin Leave',
        email: `hr.leave.${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: Role.HR_ADMIN,
        faceEmbedding: [],
      },
    });

    supervisor = await prisma.user.create({
      data: {
        nama: 'Supervisor Leave',
        email: `spv.leave.${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: Role.SUPERVISOR,
        faceEmbedding: [],
      },
    });

    karyawan = await prisma.user.create({
      data: {
        nama: 'Karyawan Leave',
        email: `krw.leave.${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: Role.KARYAWAN,
        faceEmbedding: [],
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.pengajuanIzin.deleteMany({
      where: { karyawanId: karyawan.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [hrAdmin.id, supervisor.id, karyawan.id, 'user-another'] },
      },
    });

    writeFileSpy.mockRestore();
    mkdirSpy.mockRestore();

    await app.close();
  });

  afterEach(async () => {
    await prisma.pengajuanIzin.deleteMany({
      where: { karyawanId: { in: [karyawan.id, 'user-another'] } },
    });
    jest.clearAllMocks();
  });

  const getAuthToken = (user: User) => {
    return jwtService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  };

  describe('POST /leave-requests', () => {
    it('should return 403 for HR_ADMIN', async () => {
      const token = getAuthToken(hrAdmin);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-01')
        .field('tanggalSelesai', '2026-08-01')
        .field('jenis', 'IZIN')
        .field('alasan', 'Ada urusan keluarga');

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for SUPERVISOR', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-01')
        .field('tanggalSelesai', '2026-08-01')
        .field('jenis', 'IZIN')
        .field('alasan', 'Ada urusan');

      expect(res.status).toBe(403);
    });

    it('should return 400 if jenis is not valid enum', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-01')
        .field('tanggalSelesai', '2026-08-01')
        .field('jenis', 'MABOL') // invalid
        .field('alasan', 'Main bola');

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if tanggalSelesai < tanggalMulai', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-02')
        .field('tanggalSelesai', '2026-08-01')
        .field('jenis', 'IZIN')
        .field('alasan', 'Urusan keluarga');

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(400);
      expect(body.error.code).toBe('RENTANG_TANGGAL_TIDAK_VALID');
    });

    it('should return 201 for IZIN without document', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-01')
        .field('tanggalSelesai', '2026-08-01')
        .field('jenis', 'IZIN')
        .field('alasan', 'Urusan keluarga');

      const body = res.body as SuccessEnvelope<{ status: string; id: string }>;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING');
      expect(body.data.id).toBeDefined();

      const dbRecord = await prisma.pengajuanIzin.findUnique({
        where: { id: body.data.id },
      });
      expect(dbRecord?.dokumenPendukungUrl).toBeNull();
      expect(writeFileSpy).not.toHaveBeenCalled();
    });

    it('should return 201 for SAKIT durasi 1 hari without document', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-05')
        .field('tanggalSelesai', '2026-08-05') // Same day
        .field('jenis', 'SAKIT')
        .field('alasan', 'Demam');

      const body = res.body as SuccessEnvelope<{ status: string }>;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING');
    });

    it('should return 400 DOKUMEN_WAJIB for SAKIT durasi > 1 hari without document', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-10')
        .field('tanggalSelesai', '2026-08-11') // 2 days
        .field('jenis', 'SAKIT')
        .field('alasan', 'Tifus');

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(400);
      expect(body.error.code).toBe('DOKUMEN_WAJIB');
    });

    it('should return 201 for SAKIT durasi > 1 hari WITH document (pdf)', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-10')
        .field('tanggalSelesai', '2026-08-11')
        .field('jenis', 'SAKIT')
        .field('alasan', 'Tifus')
        .attach('dokumen', Buffer.from('dummy-pdf-content'), {
          filename: 'surat_dokter.pdf',
          contentType: 'application/pdf',
        });

      const body = res.body as SuccessEnvelope<{ status: string; id: string }>;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING');

      const dbRecord = await prisma.pengajuanIzin.findUnique({
        where: { id: body.data.id },
      });
      expect(dbRecord?.dokumenPendukungUrl).toMatch(
        /^storage\/dokumen-izin\/.+\.pdf$/,
      );
      expect(writeFileSpy).toHaveBeenCalled();
      expect(mkdirSpy).toHaveBeenCalled();
    });

    it('should return 400 FORMAT_DOKUMEN_TIDAK_VALID for unsupported file type', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-10')
        .field('tanggalSelesai', '2026-08-11')
        .field('jenis', 'SAKIT')
        .field('alasan', 'Tifus')
        .attach('dokumen', Buffer.from('dummy-exe'), {
          filename: 'virus.exe',
          contentType: 'application/x-msdownload',
        });

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(400);
      expect(body.error.code).toBe('FORMAT_DOKUMEN_TIDAK_VALID');
    });

    it('should return 409 IZIN_BENTROK if overlap with PENDING/APPROVED request', async () => {
      const token = getAuthToken(karyawan);

      // Create first pending request
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-20T00:00:00+07:00'),
          tanggalSelesai: new Date('2026-08-22T00:00:00+07:00'),
          jenis: 'CUTI',
          alasan: 'Liburan',
          status: 'PENDING',
        },
      });

      // Try to create overlapping request
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-22') // Overlaps on 22nd
        .field('tanggalSelesai', '2026-08-24')
        .field('jenis', 'IZIN')
        .field('alasan', 'Keperluan lain');

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(409);
      expect(body.error.code).toBe('IZIN_BENTROK');
    });

    it('should allow creation if overlap is with a CANCELLED/REJECTED request', async () => {
      const token = getAuthToken(karyawan);

      // Create a cancelled request
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-20T00:00:00+07:00'),
          tanggalSelesai: new Date('2026-08-22T00:00:00+07:00'),
          jenis: 'CUTI',
          alasan: 'Liburan',
          status: 'CANCELLED',
        },
      });

      // Overlapping request should now succeed
      const res = await request(app.getHttpServer() as Server)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${token}`)
        .field('tanggalMulai', '2026-08-22') // Overlaps on 22nd but old one is cancelled
        .field('tanggalSelesai', '2026-08-24')
        .field('jenis', 'IZIN')
        .field('alasan', 'Keperluan lain');

      const body = res.body as SuccessEnvelope<any>;
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /leave-requests', () => {
    it('should return 400 for SUPERVISOR without status=PENDING', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${token}`);

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('STATUS_WAJIB_PENDING');
    });

    it('should return 403 for HR_ADMIN', async () => {
      const token = getAuthToken(hrAdmin);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${token}`);

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return [] if no leave requests', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${token}`);

      const body = res.body as SuccessEnvelope<any[]>;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it("should return only the user's leave requests ordered by createdAt DESC", async () => {
      // Create another karyawan
      const anotherKaryawan = await prisma.user.create({
        data: {
          id: 'user-another',
          nama: 'Another Karyawan',
          email: 'another@example.com',
          passwordHash: 'hash',
          role: 'KARYAWAN',
        },
      });

      // Create a request for another karyawan (should NOT be returned)
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: anotherKaryawan.id,
          tanggalMulai: new Date('2026-08-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-01T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Other',
          status: 'PENDING',
        },
      });

      // Create 2 requests for the main karyawan
      const req1 = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-10T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-11T00:00:00Z'),
          jenis: 'SAKIT',
          alasan: 'Sakit',
          status: 'PENDING',
          dokumenPendukungUrl: 'storage/dokumen-izin/dummy.pdf',
          createdAt: new Date('2026-07-01T00:00:00Z'),
        },
      });

      const req2 = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-09-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-09-02T00:00:00Z'),
          jenis: 'CUTI',
          alasan: 'Liburan',
          status: 'APPROVED',
          approvedById: supervisor.id, // simulate approval
          createdAt: new Date('2026-07-02T00:00:00Z'), // newer
        },
      });

      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${token}`);

      type LeaveResponse = {
        id: string;
        tanggalMulai: string;
        tanggalSelesai: string;
        jenis: string;
        alasan: string;
        status: string;
        createdAt: string;
        dokumenPendukungUrl?: string;
        catatanSupervisor?: string | null;
        approvedBy?: { nama: string } | null;
      };

      const body = res.body as SuccessEnvelope<LeaveResponse[]>;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);

      // Verify order: newest first (req2 then req1)
      expect(body.data[0].id).toBe(req2.id);
      expect(body.data[1].id).toBe(req1.id);

      // Verify shape of response
      const firstData = body.data[0];
      expect(firstData.id).toBeDefined();
      expect(firstData.tanggalMulai).toBeDefined();
      expect(firstData.tanggalSelesai).toBeDefined();
      expect(firstData.jenis).toBe('CUTI');
      expect(firstData.alasan).toBe('Liburan');
      expect(firstData.status).toBe('APPROVED');
      expect(firstData.createdAt).toBeDefined();
      expect(firstData.approvedBy!.nama).toBe(supervisor.nama);

      const secondData = body.data[1];
      expect(secondData.jenis).toBe('SAKIT');
      expect(secondData.dokumenPendukungUrl).toBe(
        'storage/dokumen-izin/dummy.pdf',
      );
      expect(secondData.catatanSupervisor).toBeNull();
      expect(secondData.approvedBy).toBeNull();
    });
  });

  describe('GET /leave-requests?status=PENDING (SUPERVISOR)', () => {
    let siteA: import('@prisma/client').Site;
    let siteB: import('@prisma/client').Site;
    let siteC: import('@prisma/client').Site;
    let karyawan2: import('@prisma/client').User;
    let karyawan3: import('@prisma/client').User;

    beforeAll(async () => {
      // Clean up previous runs if any
      await prisma.jadwalShift.deleteMany({});
      await prisma.supervisorSite.deleteMany({});
      await prisma.site.deleteMany({
        where: { id: { in: ['site-a-id', 'site-b-id', 'site-c-id'] } },
      });
      await prisma.pengajuanIzin.deleteMany({
        where: { karyawanId: { in: ['karyawan2-id', 'karyawan3-id'] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ['karyawan2-id', 'karyawan3-id'] } },
      });

      // Setup Users
      karyawan2 = await prisma.user.create({
        data: {
          id: 'karyawan2-id',
          nama: 'Karyawan Dua',
          email: 'karyawan2@test.local',
          passwordHash: 'hash',
          role: 'KARYAWAN',
        },
      });
      karyawan3 = await prisma.user.create({
        data: {
          id: 'karyawan3-id',
          nama: 'Karyawan Tiga',
          email: 'karyawan3@test.local',
          passwordHash: 'hash',
          role: 'KARYAWAN',
        },
      });

      // Setup Sites
      siteA = await prisma.site.create({
        data: {
          id: 'site-a-id',
          nama: 'Site A',
          alamat: 'Alamat A',
          latitude: -6.2,
          longitude: 106.8,
          radiusToleransi: 50,
        },
      });
      siteB = await prisma.site.create({
        data: {
          id: 'site-b-id',
          nama: 'Site B',
          alamat: 'Alamat B',
          latitude: -6.2,
          longitude: 106.8,
          radiusToleransi: 50,
        },
      });
      siteC = await prisma.site.create({
        data: {
          id: 'site-c-id',
          nama: 'Site C',
          alamat: 'Alamat C',
          latitude: -6.2,
          longitude: 106.8,
          radiusToleransi: 50,
        },
      });

      // Assign Supervisor to Site A & B (NOT C)
      await prisma.supervisorSite.createMany({
        data: [
          { supervisorId: supervisor.id, siteId: siteA.id },
          { supervisorId: supervisor.id, siteId: siteB.id },
        ],
      });

      // Schedules:
      // Karyawan 1 di Site A tanggal 10 Agu
      // Karyawan 2 di Site B tanggal 15 Agu
      // Karyawan 3 di Site C tanggal 20 Agu
      await prisma.jadwalShift.createMany({
        data: [
          {
            karyawanId: karyawan.id,
            siteId: siteA.id,
            tanggal: new Date('2026-08-10T00:00:00Z'),
            jamMulai: new Date('2026-08-10T08:00:00Z'),
            jamSelesai: new Date('2026-08-10T17:00:00Z'),
          },
          {
            karyawanId: karyawan2.id,
            siteId: siteB.id,
            tanggal: new Date('2026-08-15T00:00:00Z'),
            jamMulai: new Date('2026-08-15T08:00:00Z'),
            jamSelesai: new Date('2026-08-15T17:00:00Z'),
          },
          {
            karyawanId: karyawan3.id,
            siteId: siteC.id,
            tanggal: new Date('2026-08-20T00:00:00Z'),
            jamMulai: new Date('2026-08-20T08:00:00Z'),
            jamSelesai: new Date('2026-08-20T17:00:00Z'),
          },
          {
            karyawanId: karyawan.id,
            siteId: siteA.id,
            tanggal: new Date('2026-08-29T00:00:00Z'),
            jamMulai: new Date('2026-08-29T20:00:00Z'),
            jamSelesai: new Date('2026-08-30T04:00:00Z'), // cross midnight
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.jadwalShift.deleteMany({});
      await prisma.supervisorSite.deleteMany({});
      await prisma.site.deleteMany({});
      await prisma.pengajuanIzin.deleteMany({
        where: { karyawanId: { in: ['karyawan2-id', 'karyawan3-id'] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ['karyawan2-id', 'karyawan3-id'] } },
      });
    });

    it('should return 400 if supervisor accesses without status=PENDING', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'STATUS_WAJIB_PENDING',
      );
    });

    it('should return 400 if supervisor accesses with status=APPROVED', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests?status=APPROVED')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'STATUS_WAJIB_PENDING',
      );
    });

    it('should return only PENDING requests for employees in supervised sites overlapping with leave dates', async () => {
      // Pengajuan Karyawan 1 (overlap dengan jadwal Site A pada 10 Agu)
      const req1 = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-09T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-11T00:00:00Z'),
          jenis: 'SAKIT',
          alasan: 'Demam',
          status: 'PENDING',
        },
      });

      // Pengajuan Karyawan 2 (overlap dengan jadwal Site B pada 15 Agu)
      const req2 = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan2.id,
          tanggalMulai: new Date('2026-08-15T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-15T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Urusan keluarga',
          status: 'PENDING',
        },
      });

      // Pengajuan Karyawan 3 (overlap dengan jadwal Site C pada 20 Agu) -> JANGAN muncul, beda site
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan3.id,
          tanggalMulai: new Date('2026-08-20T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-20T00:00:00Z'),
          jenis: 'CUTI',
          alasan: 'Liburan',
          status: 'PENDING',
        },
      });

      // Pengajuan Karyawan 1 (TIDAK overlap dengan jadwal Site A manapun) -> JANGAN muncul
      await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-09-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-09-02T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Tidak ada jadwal',
          status: 'PENDING',
        },
      });

      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests?status=PENDING')
        .set('Authorization', `Bearer ${token}`);

      type LeaveResponse = {
        id: string;
        karyawan: { id: string; nama: string };
        [key: string]: unknown;
      };

      const body = res.body as SuccessEnvelope<LeaveResponse[]>;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);

      // Verify returned requests are exactly req1 and req2
      const ids = body.data.map((d) => d.id);
      expect(ids).toContain(req1.id);
      expect(ids).toContain(req2.id);

      // Verify karyawan object is populated
      const d1 = body.data.find((d) => d.id === req1.id);
      expect(d1).toBeDefined();
      if (d1) {
        expect(d1.karyawan).toBeDefined();
        expect(d1.karyawan.nama).toBe('Karyawan Leave');
        expect(d1.karyawan.id).toBe(karyawan.id);
      }
    });

    it('should include leave request if it overlaps with a cross-midnight shift on H-1', async () => {
      // Shift is 29 Aug 20:00 to 30 Aug 04:00.
      // Leave request is on 30 Aug 00:00 to 30 Aug 00:00.
      // They should overlap.
      const reqCross = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-30T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-30T00:00:00Z'),
          jenis: 'SAKIT',
          alasan: 'Demam pagi',
          status: 'PENDING',
        },
      });

      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests?status=PENDING')
        .set('Authorization', `Bearer ${token}`);

      const body = res.body as SuccessEnvelope<{ id: string }[]>;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);

      const ids = body.data.map((d) => d.id);
      expect(ids).toContain(reqCross.id);
    });
  });

  describe('PATCH /leave-requests/:id/cancel', () => {
    let pendingRequest: PengajuanIzin;
    let approvedRequest: PengajuanIzin;
    let otherUser: User;
    let otherPendingRequest: PengajuanIzin;

    beforeAll(async () => {
      otherUser = await prisma.user.create({
        data: {
          nama: 'Other User',
          email: 'other@example.com',
          passwordHash: 'password',
          role: 'KARYAWAN',
        },
      });
    });

    beforeEach(async () => {
      pendingRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-10-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-10-02T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Urusan keluarga',
          status: 'PENDING',
        },
      });

      approvedRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-11-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-11-02T00:00:00Z'),
          jenis: 'CUTI',
          alasan: 'Liburan',
          status: 'APPROVED',
          approvedById: supervisor.id,
        },
      });

      otherPendingRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: otherUser.id,
          tanggalMulai: new Date('2026-12-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-12-02T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Urusan',
          status: 'PENDING',
        },
      });
    });

    afterEach(async () => {
      await prisma.pengajuanIzin.deleteMany({
        where: {
          id: {
            in: [
              pendingRequest?.id,
              approvedRequest?.id,
              otherPendingRequest?.id,
            ].filter(Boolean),
          },
        },
      });
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 401 if without token', async () => {
      const res = await request(app.getHttpServer() as Server).patch(
        `/leave-requests/${pendingRequest.id}/cancel`,
      );

      expect(res.status).toBe(401);
    });

    it('should return 403 if accessed by HR_ADMIN', async () => {
      const token = getAuthToken(hrAdmin);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${pendingRequest.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const token = getAuthToken(karyawan);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${fakeId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect((res.body as ErrorEnvelope).success).toBe(false);
    });

    it('should return 404 if trying to cancel other user request', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${otherPendingRequest.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 409 if status is not PENDING', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${approvedRequest.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(409);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TIDAK_BISA_DIBATALKAN');
    });

    it('should cancel PENDING request successfully', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${pendingRequest.id}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<{
        id: string;
        status: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(pendingRequest.id);
      expect(body.data.status).toBe('CANCELLED');

      // Verify DB
      const dbReq = await prisma.pengajuanIzin.findUnique({
        where: { id: pendingRequest.id },
      });
      expect(dbReq?.status).toBe('CANCELLED');
    });
  });

  describe('PATCH /leave-requests/:id/approve and reject', () => {
    let scopePendingRequest: PengajuanIzin;
    let outOfScopeRequest: PengajuanIzin;
    let processedRequest: PengajuanIzin;
    let testSite: Site;

    beforeAll(async () => {
      testSite = await prisma.site.create({
        data: {
          id: 'test-site-approve-id',
          nama: 'Test Site Approve',
          alamat: 'Alamat',
          latitude: 0,
          longitude: 0,
          radiusToleransi: 50,
        },
      });

      await prisma.supervisorSite.create({
        data: { supervisorId: supervisor.id, siteId: testSite.id },
      });

      await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: testSite.id,
          tanggal: new Date('2026-08-10T00:00:00Z'),
          jamMulai: new Date('2026-08-10T08:00:00Z'),
          jamSelesai: new Date('2026-08-10T17:00:00Z'),
        },
      });
    });

    afterAll(async () => {
      await prisma.jadwalShift.deleteMany({ where: { siteId: testSite.id } });
      await prisma.supervisorSite.deleteMany({
        where: { siteId: testSite.id },
      });
      await prisma.site.delete({ where: { id: testSite.id } });
    });

    beforeEach(async () => {
      // 1. In scope (overlaps with 2026-08-10 shift on site A)
      scopePendingRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-10T00:00:00Z'),
          tanggalSelesai: new Date('2026-08-10T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Urusan keluarga',
          status: 'PENDING',
        },
      });

      // 2. Out of scope (overlaps with no shift, e.g., 2027)
      outOfScopeRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2027-01-01T00:00:00Z'),
          tanggalSelesai: new Date('2027-01-01T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Tahun baru',
          status: 'PENDING',
        },
      });

      // 3. Processed request
      processedRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-08-10T00:00:00Z'), // in scope
          tanggalSelesai: new Date('2026-08-10T00:00:00Z'),
          jenis: 'CUTI',
          alasan: 'Liburan',
          status: 'APPROVED',
          approvedById: supervisor.id,
        },
      });
    });

    afterEach(async () => {
      await prisma.pengajuanIzin.deleteMany({
        where: {
          id: {
            in: [
              scopePendingRequest.id,
              outOfScopeRequest.id,
              processedRequest.id,
            ],
          },
        },
      });
    });

    it('should return 401 if without token', async () => {
      const res = await request(app.getHttpServer() as Server).patch(
        `/leave-requests/${scopePendingRequest.id}/approve`,
      );
      expect(res.status).toBe(401);
    });

    it('should return 403 if accessed by KARYAWAN', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${scopePendingRequest.id}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 if accessed by HR_ADMIN', async () => {
      const token = getAuthToken(hrAdmin);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${scopePendingRequest.id}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent ID', async () => {
      const token = getAuthToken(supervisor);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${fakeId}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect((res.body as ErrorEnvelope).error.message).toBe(
        'Pengajuan izin tidak ditemukan',
      );
    });

    it('should return 404 if request is out of scope (not matching schedule)', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${outOfScopeRequest.id}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect((res.body as ErrorEnvelope).error.message).toBe(
        'Pengajuan izin tidak ditemukan',
      );
    });

    it('should return 409 IZIN_SUDAH_DIPROSES if status is not PENDING', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${processedRequest.id}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(409);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'IZIN_SUDAH_DIPROSES',
      );
    });

    it('should approve successfully WITH catatanSupervisor', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${scopePendingRequest.id}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ catatanSupervisor: 'Silakan beristirahat' });

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<{ id: string; status: string }>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(scopePendingRequest.id);
      expect(body.data.status).toBe('APPROVED');

      // Verify DB
      const dbReq = await prisma.pengajuanIzin.findUnique({
        where: { id: scopePendingRequest.id },
      });
      expect(dbReq?.status).toBe('APPROVED');
      expect(dbReq?.catatanSupervisor).toBe('Silakan beristirahat');
      expect(dbReq?.approvedById).toBe(supervisor.id);
    });

    it('should reject successfully WITHOUT catatanSupervisor', async () => {
      const token = getAuthToken(supervisor);

      // we need a new request to reject because scopePendingRequest is already approved in previous test if it ran (wait, jest cleans up in afterEach and recreates in beforeEach)
      const res = await request(app.getHttpServer() as Server)
        .patch(`/leave-requests/${scopePendingRequest.id}/reject`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<{ id: string; status: string }>;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('REJECTED');

      // Verify DB
      const dbReq = await prisma.pengajuanIzin.findUnique({
        where: { id: scopePendingRequest.id },
      });
      expect(dbReq?.status).toBe('REJECTED');
      expect(dbReq?.catatanSupervisor).toBeNull();
      expect(dbReq?.approvedById).toBe(supervisor.id);
    });
  });

  describe('GET /leave-requests/history', () => {
    let pendingRequest: PengajuanIzin;
    let approvedRequest: PengajuanIzin;
    let otherUser: User;
    let otherRequest: PengajuanIzin;

    beforeAll(async () => {
      otherUser = await prisma.user.create({
        data: {
          nama: 'Other History User',
          email: 'other_history@example.com',
          passwordHash: 'password',
          role: 'KARYAWAN',
        },
      });
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    beforeEach(async () => {
      // Clean up first to be safe
      await prisma.pengajuanIzin.deleteMany({});

      pendingRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-05-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-05-01T00:00:00Z'),
          jenis: 'IZIN',
          alasan: 'Pending History',
          status: 'PENDING',
        },
      });

      approvedRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: new Date('2026-06-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-06-02T00:00:00Z'),
          jenis: 'CUTI',
          alasan: 'Approved History',
          status: 'APPROVED',
          approvedById: supervisor.id,
        },
      });

      otherRequest = await prisma.pengajuanIzin.create({
        data: {
          karyawanId: otherUser.id,
          tanggalMulai: new Date('2026-07-01T00:00:00Z'),
          tanggalSelesai: new Date('2026-07-01T00:00:00Z'),
          jenis: 'SAKIT',
          alasan: 'Other History',
          status: 'REJECTED',
          approvedById: supervisor.id,
        },
      });
    });

    afterEach(async () => {
      await prisma.pengajuanIzin.deleteMany({
        where: {
          id: {
            in: [pendingRequest.id, approvedRequest.id, otherRequest.id],
          },
        },
      });
    });

    it('should return 401 if without token', async () => {
      const res = await request(app.getHttpServer() as Server).get(
        '/leave-requests/history',
      );
      expect(res.status).toBe(401);
    });

    it('should return 403 if accessed by KARYAWAN', async () => {
      const token = getAuthToken(karyawan);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 if accessed by SUPERVISOR', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return all history across all statuses and users when no filter is applied', async () => {
      const token = getAuthToken(hrAdmin);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<
        {
          id: string;
          status: string;
          approvedBy: { id: string; nama: string } | null;
        }[]
      >;
      expect(body.success).toBe(true);

      const ids = body.data.map((d) => d.id);
      expect(ids).toContain(pendingRequest.id);
      expect(ids).toContain(approvedRequest.id);
      expect(ids).toContain(otherRequest.id);

      const approvedItem = body.data.find((d) => d.id === approvedRequest.id);
      expect(approvedItem).toBeDefined();
      expect(approvedItem!.status).toBe('APPROVED');
      expect(approvedItem!.approvedBy).toBeDefined();
      expect(approvedItem!.approvedBy!.id).toBe(supervisor.id);
      expect(approvedItem!.approvedBy!.nama).toBe(supervisor.nama);

      const pendingItem = body.data.find((d) => d.id === pendingRequest.id);
      expect(pendingItem).toBeDefined();
      expect(pendingItem!.status).toBe('PENDING');
      expect(pendingItem!.approvedBy).toBeNull();
    });

    it('should filter by karyawanId', async () => {
      const token = getAuthToken(hrAdmin);
      const res = await request(app.getHttpServer() as Server)
        .get(`/leave-requests/history?karyawanId=${otherUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<
        {
          id: string;
          status: string;
          approvedBy: { id: string; nama: string } | null;
        }[]
      >;
      expect(body.success).toBe(true);

      const ids = body.data.map((d) => d.id);
      expect(ids).toContain(otherRequest.id);
      expect(ids).not.toContain(pendingRequest.id);
      expect(ids).not.toContain(approvedRequest.id);
    });

    it('should filter by periodeMulai and periodeSelesai (range)', async () => {
      const token = getAuthToken(hrAdmin);
      // Filter for June (only approvedRequest is in June)
      const res = await request(app.getHttpServer() as Server)
        .get(
          '/leave-requests/history?periodeMulai=2026-06-01&periodeSelesai=2026-06-30',
        )
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<
        {
          id: string;
          status: string;
          approvedBy: { id: string; nama: string } | null;
        }[]
      >;
      expect(body.success).toBe(true);

      const ids = body.data.map((d) => d.id);
      expect(ids).toContain(approvedRequest.id);
      expect(ids).not.toContain(pendingRequest.id);
      expect(ids).not.toContain(otherRequest.id);
    });

    it('should filter by periodeMulai only (open-ended range)', async () => {
      const token = getAuthToken(hrAdmin);
      // Filter from June onwards (approvedRequest and otherRequest)
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests/history?periodeMulai=2026-06-01')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<
        {
          id: string;
          status: string;
          approvedBy: { id: string; nama: string } | null;
        }[]
      >;
      expect(body.success).toBe(true);

      const ids = body.data.map((d) => d.id);
      expect(ids).toContain(approvedRequest.id);
      expect(ids).toContain(otherRequest.id);
      expect(ids).not.toContain(pendingRequest.id);
    });
  });
});
