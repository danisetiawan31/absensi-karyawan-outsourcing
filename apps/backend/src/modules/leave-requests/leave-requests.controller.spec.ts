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
import { Role, User } from '@prisma/client';
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
    it('should return 403 for SUPERVISOR', async () => {
      const token = getAuthToken(supervisor);
      const res = await request(app.getHttpServer() as Server)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${token}`);

      const body = res.body as ErrorEnvelope;
      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
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
});
