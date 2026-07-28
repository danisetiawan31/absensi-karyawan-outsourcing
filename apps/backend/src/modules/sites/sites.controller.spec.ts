import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';

describe('SitesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let dummyHr: any;
  let dummyEmp: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Setup global pipes/filters/middlewares untuk testing
    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (validationErrors = []) => {
          const details = validationErrors.map((error) => ({
            field: error.property,
            issue: Object.values(error.constraints || {}).join(', '),
          }));
          const { BadRequestException } = require('@nestjs/common');
          return new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Validasi gagal',
            details,
          });
        },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create dummy users
    dummyHr = await prisma.user.create({
      data: {
        id: 'dummy-hr-id-test',
        email: 'hr@test.com',
        passwordHash: 'dummy',
        nama: 'HR Test',
        role: Role.HR_ADMIN,
        statusAktif: true,
      },
    });

    dummyEmp = await prisma.user.create({
      data: {
        id: 'dummy-emp-id-test',
        email: 'emp@test.com',
        passwordHash: 'dummy',
        nama: 'Emp Test',
        role: Role.KARYAWAN,
        statusAktif: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (prisma) {
      await prisma.site.deleteMany({
        where: { nama: 'E2E Test Site' },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ['dummy-hr-id-test', 'dummy-emp-id-test'] } },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('POST /sites', () => {
    it('Sukses: membuat site baru (201) dan return format benar', async () => {
      // Bikin mock token untuk HR_ADMIN (bisa juga pakai user dummy di DB, tapi token cukup untuk role check)
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const payload = {
        nama: 'E2E Test Site',
        alamat: 'Jl. Sudirman No 1',
        latitude: -6.2,
        longitude: 106.8,
      };

      const res = await request(app.getHttpServer())
        .post('/sites')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nama).toBe(payload.nama);
      expect(res.body.data.radiusToleransi).toBe(75);
      expect(res.body.data.statusAktif).toBe(true);
    });

    it('Gagal validasi: field required (latitude) kosong (400)', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const payload = {
        nama: 'E2E Test Site',
        alamat: 'Jl. Sudirman No 1',
        longitude: 106.8,
      };

      const res = await request(app.getHttpServer())
        .post('/sites')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      const latitudeError = res.body.error.details.find(
        (d) => d.field === 'latitude',
      );
      expect(latitudeError).toBeDefined();
    });

    it('Gagal auth: akses ditolak karena bukan HR_ADMIN (403)', async () => {
      // Token untuk role KARYAWAN
      const token = jwtService.sign({
        userId: dummyEmp.id,
        role: Role.KARYAWAN,
      });

      const payload = {
        nama: 'E2E Test Site',
        alamat: 'Jl. Sudirman No 1',
        latitude: -6.2,
        longitude: 106.8,
      };

      const res = await request(app.getHttpServer())
        .post('/sites')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Gagal auth: akses tanpa token (401)', async () => {
      const payload = {
        nama: 'E2E Test Site',
        alamat: 'Jl. Sudirman No 1',
        latitude: -6.2,
        longitude: 106.8,
      };

      const res = await request(app.getHttpServer())
        .post('/sites')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /sites', () => {
    beforeAll(async () => {
      // Bikin beberapa site dummy untuk test GET
      await prisma.site.createMany({
        data: [
          {
            nama: 'GET Site Active 1',
            alamat: 'Alamat 1',
            latitude: -6.1,
            longitude: 106.1,
            statusAktif: true,
          },
          {
            nama: 'GET Site Inactive 1',
            alamat: 'Alamat 2',
            latitude: -6.1,
            longitude: 106.1,
            statusAktif: false,
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.site.deleteMany({
        where: { nama: { in: ['GET Site Active 1', 'GET Site Inactive 1'] } },
      });
    });

    it('Tanpa query param -> return semua site (termasuk yang tidak aktif)', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer())
        .get('/sites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const activeSite = res.body.data.find(
        (s: any) => s.nama === 'GET Site Active 1',
      );
      const inactiveSite = res.body.data.find(
        (s: any) => s.nama === 'GET Site Inactive 1',
      );

      expect(activeSite).toBeDefined();
      expect(inactiveSite).toBeDefined();
    });

    it('Dengan ?statusAktif=true -> hanya return site yang statusAktif true', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer())
        .get('/sites?statusAktif=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const activeSite = res.body.data.find(
        (s: any) => s.nama === 'GET Site Active 1',
      );
      const inactiveSite = res.body.data.find(
        (s: any) => s.nama === 'GET Site Inactive 1',
      );

      expect(activeSite).toBeDefined();
      expect(inactiveSite).toBeUndefined(); // harus undefined karena difilter
    });

    it('Gagal auth: role bukan HR_ADMIN -> 403', async () => {
      const token = jwtService.sign({
        userId: dummyEmp.id,
        role: Role.KARYAWAN,
      });

      const res = await request(app.getHttpServer())
        .get('/sites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /sites/:id', () => {
    let siteId: string;

    beforeAll(async () => {
      const site = await prisma.site.create({
        data: {
          nama: 'PATCH Site 1',
          alamat: 'Alamat 1',
          latitude: -6.1,
          longitude: 106.1,
          radiusToleransi: 50,
          statusAktif: true,
        },
      });
      siteId = site.id;
    });

    afterAll(async () => {
      await prisma.site.deleteMany({
        where: { nama: 'PATCH Site 1' },
      });
    });

    it('Sukses: Update sebagian field (alamat) -> field lain tidak berubah', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer())
        .patch(`/sites/${siteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ alamat: 'Alamat Baru' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alamat).toBe('Alamat Baru');
      expect(res.body.data.nama).toBe('PATCH Site 1'); // tetap
    });

    it('Gagal: Site tidak ditemukan -> 404', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer())
        .patch('/sites/not-found-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ alamat: 'Alamat Baru' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('Sukses: statusAktif di body mengubah status (soft-deactivate)', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer())
        .patch(`/sites/${siteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statusAktif: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Di database harusnya berubah jadi false
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      expect(site?.statusAktif).toBe(false);
      expect(res.body.data.statusAktif).toBe(false);
    });

    it('Idempotent: update statusAktif ke nilai yang sama tetap sukses', async () => {
      const token = jwtService.sign({
        userId: dummyHr.id,
        role: Role.HR_ADMIN,
      });

      // statusAktif sudah false dari test sebelumnya, kita set false lagi
      const res = await request(app.getHttpServer())
        .patch(`/sites/${siteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statusAktif: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      expect(site?.statusAktif).toBe(false);
    });

    it('Gagal auth: role bukan HR_ADMIN -> 403', async () => {
      const token = jwtService.sign({
        userId: dummyEmp.id,
        role: Role.KARYAWAN,
      });

      const res = await request(app.getHttpServer())
        .patch(`/sites/${siteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ alamat: 'Alamat Baru' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
