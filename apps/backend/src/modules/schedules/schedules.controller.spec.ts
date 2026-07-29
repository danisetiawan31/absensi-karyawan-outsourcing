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
            '88888888-8888-4888-a888-888888888888',
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
            '88888888-8888-8888-8888-888888888888',
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
        where: {
          siteId: {
            in: [
              siteAktif.id,
              siteNonAktif.id,
              siteLain.id,
              '88888888-8888-4888-a888-888888888888',
            ],
          },
        },
      });
      await prisma.site.deleteMany({
        where: {
          id: {
            in: [
              siteAktif.id,
              siteNonAktif.id,
              siteLain.id,
              '88888888-8888-4888-a888-888888888888',
            ],
          },
        },
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
    it('should return 400 if shift duration is 0 (start time === end time)', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const payload: CreateScheduleDto = {
        karyawanId: karyawan.id,
        siteId: siteAktif.id,
        tanggal: '2026-08-01',
        jamMulai: '15:00',
        jamSelesai: '15:00', // 0 duration
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

  describe('GET /schedules', () => {
    it('should return 400 if tanggal query is missing', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/schedules')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/schedules?tanggal=2026-08-01')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return empty array if caller has no SupervisorSite assignment', async () => {
      // HR Admin doesn't have supervisor assignments, but they are forbidden.
      // Let's create a new SUPERVISOR user with no assignments
      const supervisorNoSite = await prisma.user.upsert({
        where: { id: '12345678-1234-1234-1234-123456789012' },
        update: {},
        create: {
          id: '12345678-1234-1234-1234-123456789012',
          nama: 'Supervisor No Site',
          email: 'nositex@example.com',
          passwordHash: 'hash',
          role: Role.SUPERVISOR,
        },
      });

      const token = jwtService.sign({
        userId: supervisorNoSite.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/schedules?tanggal=2026-08-01')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<unknown[]>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);

      await prisma.user.delete({ where: { id: supervisorNoSite.id } });
    });

    it('should return empty array if querying siteId not supervised by caller', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      // supervisor only supervises siteAktif and siteNonAktif, NOT siteLain
      const res = await request(app.getHttpServer() as Server)
        .get(`/schedules?tanggal=2026-08-01&siteId=${siteLain.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<unknown[]>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    describe('with populated schedules', () => {
      beforeEach(async () => {
        // Create multiple schedules for testing retrieval
        await prisma.jadwalShift.createMany({
          data: [
            // siteAktif, tanggal 01
            {
              karyawanId: karyawan.id,
              siteId: siteAktif.id,
              tanggal: new Date('2026-08-01T00:00:00+07:00'),
              jamMulai: new Date('2026-08-01T15:00:00+07:00'), // later start
              jamSelesai: new Date('2026-08-01T23:00:00+07:00'),
            },
            {
              karyawanId: karyawan2.id,
              siteId: siteAktif.id,
              tanggal: new Date('2026-08-01T00:00:00+07:00'),
              jamMulai: new Date('2026-08-01T08:00:00+07:00'), // earlier start
              jamSelesai: new Date('2026-08-01T16:00:00+07:00'),
            },
            // siteNonAktif, tanggal 01 (Supervisor 1 supervises this too)
            {
              karyawanId: karyawan.id,
              siteId: siteNonAktif.id,
              tanggal: new Date('2026-08-01T00:00:00+07:00'),
              jamMulai: new Date('2026-08-01T09:00:00+07:00'),
              jamSelesai: new Date('2026-08-01T17:00:00+07:00'),
            },
            // siteLain, tanggal 01 (Not supervised by Supervisor 1)
            {
              karyawanId: karyawan.id,
              siteId: siteLain.id,
              tanggal: new Date('2026-08-01T00:00:00+07:00'),
              jamMulai: new Date('2026-08-01T10:00:00+07:00'),
              jamSelesai: new Date('2026-08-01T18:00:00+07:00'),
            },
            // siteAktif, tanggal 02 (Different date)
            {
              karyawanId: karyawan.id,
              siteId: siteAktif.id,
              tanggal: new Date('2026-08-02T00:00:00+07:00'),
              jamMulai: new Date('2026-08-02T08:00:00+07:00'),
              jamSelesai: new Date('2026-08-02T16:00:00+07:00'),
            },
          ],
        });
      });

      it('should return all schedules across all supervised sites for the date, sorted by jamMulai', async () => {
        const token = jwtService.sign({
          userId: supervisor.id,
          role: Role.SUPERVISOR,
        });

        const res = await request(app.getHttpServer() as Server)
          .get('/schedules?tanggal=2026-08-01')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const body = res.body as SuccessEnvelope<
          {
            id: string;
            jamMulai: string;
            karyawan: { id: string; nama: string };
            site: { id: string; nama: string };
          }[]
        >;
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(3); // 2 in siteAktif, 1 in siteNonAktif. (siteLain excluded, 02 date excluded)

        const data = body.data;
        // Check sorting: 08:00 -> 09:00 -> 15:00
        expect(new Date(data[0].jamMulai).getTime()).toBeLessThan(
          new Date(data[1].jamMulai).getTime(),
        );
        expect(new Date(data[1].jamMulai).getTime()).toBeLessThan(
          new Date(data[2].jamMulai).getTime(),
        );

        // Check payload structure
        expect(data[0].karyawan.id).toBe(karyawan2.id); // the 08:00 one is karyawan2
        expect(data[0].site.id).toBe(siteAktif.id);
      });

      it('should return schedules ONLY for the requested siteId if provided', async () => {
        const token = jwtService.sign({
          userId: supervisor.id,
          role: Role.SUPERVISOR,
        });

        const res = await request(app.getHttpServer() as Server)
          .get(`/schedules?tanggal=2026-08-01&siteId=${siteAktif.id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const body = res.body as SuccessEnvelope<{ site: { id: string } }[]>;
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(2); // Only the 2 in siteAktif
        expect(body.data.every((d) => d.site.id === siteAktif.id)).toBe(true);
      });
    });
  });

  describe('PATCH /schedules/:id', () => {
    let testJadwalId: string;
    let testJadwalSiteNonAktifId: string;

    beforeEach(async () => {
      const j1 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: siteAktif.id,
          tanggal: new Date('2026-08-01T00:00:00+07:00'),
          jamMulai: new Date('2026-08-01T10:00:00+07:00'),
          jamSelesai: new Date('2026-08-01T18:00:00+07:00'),
        },
      });
      testJadwalId = j1.id;

      const j2 = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: siteNonAktif.id,
          tanggal: new Date('2026-08-02T00:00:00+07:00'),
          jamMulai: new Date('2026-08-02T10:00:00+07:00'),
          jamSelesai: new Date('2026-08-02T18:00:00+07:00'),
        },
      });
      testJadwalSiteNonAktifId = j2.id;
    });

    it('should return 403 for HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '11:00' });

      expect(res.status).toBe(403);
    });

    it('should return 404 if :id not found', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '11:00' });

      expect(res.status).toBe(404);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'JADWAL_TIDAK_DITEMUKAN',
      );
    });

    it('should return 403 if caller does not supervise the OLD site', async () => {
      // Supervisor 2 does not supervise siteAktif
      const token = jwtService.sign({
        userId: supervisor2.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '11:00' });

      expect(res.status).toBe(403);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'SITE_DI_LUAR_PENGAWASAN',
      );
    });

    it('should return 400 if updated shift duration exceeds 16 hours', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      // Original is 10:00 to 18:00
      // Change jamMulai to 15:00 and jamSelesai to 14:00 (durasi 23 jam)
      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '15:00', jamSelesai: '14:00' });

      expect(res.status).toBe(400);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'DURASI_SHIFT_TIDAK_VALID',
      );
    });

    it('should return 400 if updated shift duration is 0', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '15:00', jamSelesai: '15:00' });

      expect(res.status).toBe(400);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'DURASI_SHIFT_TIDAK_VALID',
      );
    });

    it('should return 400 if changing siteId to an inactive site', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ siteId: siteNonAktif.id });

      expect(res.status).toBe(400);
      expect((res.body as ErrorEnvelope).error.code).toBe('SITE_TIDAK_AKTIF');
    });

    it('should return 403 if changing siteId to an active site but not supervised by caller', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ siteId: siteLain.id }); // siteLain is active but not supervised by this supervisor

      expect(res.status).toBe(403);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'SITE_DI_LUAR_PENGAWASAN',
      );
    });

    it('should return 400 if changing karyawanId to non-KARYAWAN role', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ karyawanId: supervisor.id }); // Supervisor is not a KARYAWAN

      expect(res.status).toBe(400);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'ROLE_BUKAN_KARYAWAN',
      );
    });

    it('should return 200 and allow partial update of times, leaving other fields unchanged', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '12:00', jamSelesai: '20:00' });

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<{
        id: string;
        jamMulai: string;
        jamSelesai: string;
        karyawan: { id: string };
        site: { id: string };
        tanggal: string;
      }>;
      expect(body.success).toBe(true);

      const tzOffset = 7 * 60 * 60 * 1000;
      const getWibHour = (dStr: string) =>
        new Date(new Date(dStr).getTime() + tzOffset).getUTCHours();

      expect(getWibHour(body.data.jamMulai)).toBe(12);
      expect(getWibHour(body.data.jamSelesai)).toBe(20);
      expect(body.data.karyawan.id).toBe(karyawan.id); // unchanged
      expect(body.data.site.id).toBe(siteAktif.id); // unchanged
    });

    it('should allow updating schedule in an INACTIVE site if siteId is NOT changed (exception 3c)', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalSiteNonAktifId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '11:00' });

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<{ jamMulai: string }>;

      const tzOffset = 7 * 60 * 60 * 1000;
      const getWibHour = (dStr: string) =>
        new Date(new Date(dStr).getTime() + tzOffset).getUTCHours();
      expect(getWibHour(body.data.jamMulai)).toBe(11);
    });

    it('should allow updating schedule in an INACTIVE site if siteId IS sent but IDENTICAL to existing (exception 3c)', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalSiteNonAktifId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ siteId: siteNonAktif.id, jamMulai: '11:00' });

      expect(res.status).toBe(200);
    });

    it('should return 409 if new time overlaps with another schedule of the same karyawan', async () => {
      // First create another schedule for the same karyawan
      await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: siteAktif.id,
          tanggal: new Date('2026-08-01T00:00:00+07:00'),
          jamMulai: new Date('2026-08-01T20:00:00+07:00'),
          jamSelesai: new Date('2026-08-01T23:00:00+07:00'),
        },
      });

      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      // Try to extend testJadwalId from 10:00-18:00 to 10:00-21:00 (overlaps with 20:00-23:00)
      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamSelesai: '21:00' });

      expect(res.status).toBe(409);
      expect((res.body as ErrorEnvelope).error.code).toBe('JADWAL_BENTROK');
    });

    it('should NOT return 409 when updating its own time even if it "overlaps" with its own old time', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      // TestJadwal is 10:00 - 18:00. We change it to 12:00 - 18:00
      const res = await request(app.getHttpServer() as Server)
        .patch(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ jamMulai: '12:00' });

      expect(res.status).toBe(200);
    });

    it('should allow changing siteId to another supervised active site', async () => {
      // First create another active site supervised by caller
      const activeSite2 = await prisma.site.create({
        data: {
          id: '88888888-8888-4888-a888-888888888888',
          nama: 'Active Site 2',
          alamat: 'Test Address',
          latitude: 0,
          longitude: 0,
          statusAktif: true,
        },
      });
      await prisma.supervisorSite.create({
        data: {
          supervisorId: supervisor.id,
          siteId: activeSite2.id,
        },
      });

      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      let res: request.Response;
      try {
        res = await request(app.getHttpServer() as Server)
          .patch(`/schedules/${testJadwalId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ siteId: activeSite2.id });

        if (res.status !== 200) {
          console.log('TEST FAILED. BODY:', res.body);
        }
        expect(res.status).toBe(200);
        const body = res.body as SuccessEnvelope<{ site: { id: string } }>;
        expect(body.data.site.id).toBe(activeSite2.id);
      } finally {
        await prisma.jadwalShift.update({
          where: { id: testJadwalId },
          data: { siteId: siteAktif.id },
        });
        await prisma.supervisorSite.delete({
          where: {
            supervisorId_siteId: {
              supervisorId: supervisor.id,
              siteId: activeSite2.id,
            },
          },
        });
        await prisma.site.delete({ where: { id: activeSite2.id } });
      }
    });
  });

  describe('DELETE /schedules/:id', () => {
    let testJadwalId: string;

    beforeEach(async () => {
      // Create a fresh schedule for deletion tests
      const j = await prisma.jadwalShift.create({
        data: {
          karyawanId: karyawan.id,
          siteId: siteAktif.id,
          tanggal: new Date('2026-09-01T00:00:00+07:00'),
          jamMulai: new Date('2026-09-01T08:00:00+07:00'),
          jamSelesai: new Date('2026-09-01T16:00:00+07:00'),
        },
      });
      testJadwalId = j.id;
    });

    afterEach(async () => {
      await prisma.logKehadiran.deleteMany({
        where: { jadwalId: testJadwalId },
      });
      await prisma.percobaanAbsensi.deleteMany({
        where: { jadwalId: testJadwalId },
      });
      await prisma.jadwalShift.deleteMany({
        where: { id: testJadwalId },
      });
    });

    it('should return 403 for HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .delete(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 if :id is not a valid UUID', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .delete('/schedules/not-a-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 if :id not found', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .delete('/schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'JADWAL_TIDAK_DITEMUKAN',
      );
    });

    it('should return 403 if caller does not supervise the site', async () => {
      // Supervisor 2 does not supervise siteAktif
      const token = jwtService.sign({
        userId: supervisor2.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .delete(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'SITE_DI_LUAR_PENGAWASAN',
      );
    });

    it('should return 409 if schedule has LogKehadiran', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      await prisma.logKehadiran.create({
        data: {
          jadwalId: testJadwalId,
          karyawanId: karyawan.id,
          waktuCheckIn: new Date(),
        },
      });

      const res = await request(app.getHttpServer() as Server)
        .delete(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'SUDAH_ADA_AKTIVITAS',
      );
    });

    it('should return 409 if schedule has PercobaanAbsensi (but no LogKehadiran)', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      await prisma.percobaanAbsensi.create({
        data: {
          jadwalId: testJadwalId,
          karyawanId: karyawan.id,
          tipe: 'CHECK_IN',
          latitude: 0,
          longitude: 0,
          hasil: 'GAGAL_LOKASI',
        },
      });

      const res = await request(app.getHttpServer() as Server)
        .delete(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect((res.body as ErrorEnvelope).error.code).toBe(
        'SUDAH_ADA_AKTIVITAS',
      );
    });

    it('should delete schedule successfully if all validations pass', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .delete(`/schedules/${testJadwalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect((res.body as SuccessEnvelope<null>).success).toBe(true);

      const checkDb = await prisma.jadwalShift.findUnique({
        where: { id: testJadwalId },
      });
      expect(checkDb).toBeNull();
    });
  });
});
