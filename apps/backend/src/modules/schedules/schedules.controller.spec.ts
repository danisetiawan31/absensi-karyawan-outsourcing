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
import { Role, User, Site } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';
import { CreateScheduleDto } from './dto/create-schedule.dto';

describe('SchedulesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let hrAdmin: User;
  let supervisor: User;
  let supervisor2: User;
  let karyawan: User;
  let karyawan2: User;
  let siteAktif: Site;
  let siteNonAktif: Site;
  let siteLain: Site;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Konfigurasi persis seperti main.ts
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

    // Clean up first just in case
    await prisma.jadwalShift.deleteMany({
      where: {
        karyawanId: {
          in: [
            '33333333-3333-4333-a333-333333333333',
            '33333333-4444-4333-a333-333333333333',
          ],
        },
      },
    });
    await prisma.supervisorSite.deleteMany({
      where: {
        siteId: {
          in: [
            '44444444-4444-4444-a444-444444444444',
            '55555555-5555-4555-a555-555555555555',
            '66666666-6666-4666-a666-666666666666',
          ],
        },
      },
    });
    await prisma.site.deleteMany({
      where: {
        id: {
          in: [
            '44444444-4444-4444-a444-444444444444',
            '55555555-5555-4555-a555-555555555555',
            '66666666-6666-4666-a666-666666666666',
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            '11111111-1111-4111-a111-111111111111',
            '22222222-2222-4222-a222-222222222222',
            '99999999-9999-4999-a999-999999999999',
            '33333333-3333-4333-a333-333333333333',
            '33333333-4444-4333-a333-333333333333',
          ],
        },
      },
    });

    // Setup Dummy Data
    hrAdmin = await prisma.user.create({
      data: {
        id: '11111111-1111-4111-a111-111111111111',
        nama: 'HR SS',
        email: 'hr.sch@test.local',
        passwordHash: 'hash',
        role: Role.HR_ADMIN,
        faceEmbedding: [],
      },
    });

    supervisor = await prisma.user.create({
      data: {
        id: '22222222-2222-4222-a222-222222222222',
        nama: 'Spv SS',
        email: 'spv.sch@test.local',
        passwordHash: 'hash',
        role: Role.SUPERVISOR,
        faceEmbedding: [],
      },
    });

    supervisor2 = await prisma.user.create({
      data: {
        id: '99999999-9999-4999-a999-999999999999',
        nama: 'Spv2 SS',
        email: 'spv2.sch@test.local',
        passwordHash: 'hash',
        role: Role.SUPERVISOR,
        faceEmbedding: [],
      },
    });

    karyawan = await prisma.user.create({
      data: {
        id: '33333333-3333-4333-a333-333333333333',
        nama: 'Kar SS',
        email: 'kar.sch@test.local',
        passwordHash: 'hash',
        role: Role.KARYAWAN,
        faceEmbedding: [],
      },
    });

    karyawan2 = await prisma.user.create({
      data: {
        id: '33333333-4444-4333-a333-333333333333',
        nama: 'Kar2 SS',
        email: 'kar2.sch@test.local',
        passwordHash: 'hash',
        role: Role.KARYAWAN,
        faceEmbedding: [],
      },
    });

    siteAktif = await prisma.site.create({
      data: {
        id: '44444444-4444-4444-a444-444444444444',
        nama: 'Site Aktif SS',
        alamat: 'Alamat SS',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100,
        statusAktif: true,
      },
    });

    siteNonAktif = await prisma.site.create({
      data: {
        id: '55555555-5555-4555-a555-555555555555',
        nama: 'Site NonAktif SS',
        alamat: 'Alamat SS',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100,
        statusAktif: false,
      },
    });

    siteLain = await prisma.site.create({
      data: {
        id: '66666666-6666-4666-a666-666666666666',
        nama: 'Site Lain SS',
        alamat: 'Alamat SS',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100,
        statusAktif: true,
      },
    });

    // SupervisorSite mappings
    await prisma.supervisorSite.createMany({
      data: [
        { supervisorId: supervisor.id, siteId: siteAktif.id },
        { supervisorId: supervisor.id, siteId: siteNonAktif.id },
        { supervisorId: supervisor2.id, siteId: siteLain.id },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.jadwalShift.deleteMany({
        where: { karyawanId: { in: [karyawan.id, karyawan2.id] } },
      });
      await prisma.supervisorSite.deleteMany({
        where: { siteId: { in: [siteAktif.id, siteNonAktif.id, siteLain.id] } },
      });
      await prisma.site.deleteMany({
        where: { id: { in: [siteAktif.id, siteNonAktif.id, siteLain.id] } },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [
              hrAdmin.id,
              supervisor.id,
              supervisor2.id,
              karyawan.id,
              karyawan2.id,
            ],
          },
        },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    await prisma.jadwalShift.deleteMany({
      where: { karyawanId: { in: [karyawan.id, karyawan2.id] } },
    });
  });

  describe('POST /schedules', () => {
    it('should return 403 for HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('should return 403 for KARYAWAN', async () => {
      const token = jwtService.sign({
        userId: karyawan.id,
        role: Role.KARYAWAN,
      });
      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('should return 400 if validation fails', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload = {
        karyawanId: 'not-uuid',
        siteId: 'not-uuid',
        tanggal: '2026/08/01', // wrong format
        jamMulai: '24:00', // wrong format
        jamSelesai: '9:0', // wrong format
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if karyawanId not found', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: '77777777-7777-4777-a777-777777777777',
        siteId: siteAktif.id,
        tanggal: '2026-08-01',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(404);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('KARYAWAN_TIDAK_DITEMUKAN');
    });

    it('should return 400 if karyawanId is not a KARYAWAN', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: supervisor2.id, // Role is SUPERVISOR
        siteId: siteAktif.id,
        tanggal: '2026-08-01',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('ROLE_BUKAN_KARYAWAN');
    });

    it('should return 404 if siteId not found', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: '88888888-8888-4888-a888-888888888888',
        tanggal: '2026-08-01',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(404);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('SITE_TIDAK_DITEMUKAN');
    });

    it('should return 400 if siteId is nonaktif', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteNonAktif.id,
        tanggal: '2026-08-01',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('SITE_TIDAK_AKTIF');
    });

    it('should return 403 if siteId is not supervised by caller', async () => {
      // Supervisor 1 mencoba menugaskan ke siteLain yang diawasi supervisor 2
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteLain.id,
        tanggal: '2026-08-01',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(403);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('SITE_DI_LUAR_PENGAWASAN');
    });

    it('should return 400 if shift duration exceeds 16 hours (accidental swap)', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteAktif.id,
        tanggal: '2026-08-01',
        jamMulai: '15:00',
        jamSelesai: '14:00', // +24h = 23 hours duration
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('DURASI_SHIFT_TIDAK_VALID');
    });

    it('should create schedule successfully', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteAktif.id,
        tanggal: '2026-08-01',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      const body = res.body as SuccessEnvelope<{ id: string; tanggal: string }>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.tanggal).toBe('2026-07-31T17:00:00.000Z'); // 2026-08-01T00:00:00+07:00
    });

    it('should return 409 if schedule overlaps (same day)', async () => {
      // Create first schedule
      await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: siteAktif.id,
          tanggal: new Date('2026-08-02T00:00:00+07:00'),
          jamMulai: new Date('2026-08-02T10:00:00+07:00'),
          jamSelesai: new Date('2026-08-02T15:00:00+07:00'),
        },
      });

      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteAktif.id,
        tanggal: '2026-08-02',
        jamMulai: '14:00', // overlaps with 10:00-15:00
        jamSelesai: '20:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(409);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('JADWAL_BENTROK');
    });

    it('should allow back-to-back schedule (no overlap)', async () => {
      // Create first schedule
      await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: siteAktif.id,
          tanggal: new Date('2026-08-03T00:00:00+07:00'),
          jamMulai: new Date('2026-08-03T07:00:00+07:00'),
          jamSelesai: new Date('2026-08-03T15:00:00+07:00'),
        },
      });

      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteAktif.id,
        tanggal: '2026-08-03',
        jamMulai: '15:00', // back-to-back with 15:00
        jamSelesai: '23:00',
      };

      const res = await request(app.getHttpServer() as Server)
        .post('/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      const body = res.body as SuccessEnvelope<{ id: string }>;
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
    });
  });
});
