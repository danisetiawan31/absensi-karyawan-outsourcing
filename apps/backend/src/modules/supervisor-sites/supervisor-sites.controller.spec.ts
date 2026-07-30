import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'http';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, User, Site } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';

type AssignmentType = {
  id: string;
  site: {
    id: string;
    nama: string;
    alamat: string;
  };
};

describe('SupervisorSitesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let hrAdmin: User;
  let supervisor: User;
  let supervisor2: User;
  let karyawan: User;
  let site: Site;
  let site2: Site;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (validationErrors: ValidationError[] = []) => {
          const details = validationErrors.map((error) => ({
            field: error.property,
            issue: Object.values(error.constraints || {}).join(', '),
          }));
          return new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Validasi gagal',
            details,
          });
        },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await app.init();

    // Setup Test Data
    hrAdmin = await prisma.user.create({
      data: {
        id: 'b1111111-1111-4111-a111-111111111111',
        nama: 'HR Admin SS',
        email: 'hr.ss@test.local',
        passwordHash: 'hash',
        role: Role.HR_ADMIN,
        faceEmbedding: [],
      },
    });

    supervisor = await prisma.user.create({
      data: {
        id: 'b2222222-2222-4222-a222-222222222222',
        nama: 'Supervisor SS',
        email: 'spv.ss@test.local',
        passwordHash: 'hash',
        role: Role.SUPERVISOR,
        faceEmbedding: [],
      },
    });

    supervisor2 = await prisma.user.create({
      data: {
        id: 'b9999999-9999-4999-a999-999999999999',
        nama: 'Supervisor 2 SS',
        email: 'spv2.ss@test.local',
        passwordHash: 'hash',
        role: Role.SUPERVISOR,
        faceEmbedding: [],
      },
    });

    karyawan = await prisma.user.create({
      data: {
        id: 'b3333333-3333-4333-a333-333333333333',
        nama: 'Karyawan SS',
        email: 'emp.ss@test.local',
        passwordHash: 'hash',
        role: Role.KARYAWAN,
        faceEmbedding: [],
      },
    });

    site = await prisma.site.create({
      data: {
        id: 'b4444444-4444-4444-a444-444444444444',
        nama: 'Site SS',
        alamat: 'Alamat SS',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100,
        statusAktif: true,
      },
    });

    site2 = await prisma.site.create({
      data: {
        id: 'b5555555-5555-4555-a555-555555555555',
        nama: 'Site 2 SS',
        alamat: 'Alamat 2 SS',
        latitude: -6.2,
        longitude: 106.8,
        radiusToleransi: 100,
        statusAktif: true,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.supervisorSite.deleteMany({
        where: { siteId: { in: [site.id, site2.id] } },
      });
      await prisma.site.deleteMany({
        where: { id: { in: [site.id, site2.id] } },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [hrAdmin.id, supervisor.id, supervisor2.id, karyawan.id] },
        },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('POST /supervisor-sites', () => {
    it('should forbid non-HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: supervisor.id,
          siteId: site.id,
        });

      expect(res.status).toBe(403);
    });

    it('should return 400 if supervisorId or siteId is not valid UUID', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: 'not-uuid',
          siteId: 'not-uuid',
        });

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if supervisorId is not found', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const notFoundId = 'b5555555-5555-4555-a555-555555555555';
      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: notFoundId,
          siteId: site.id,
        });

      if (res.status === 400) console.log(JSON.stringify(res.body, null, 2));

      expect(res.status).toBe(404);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('SUPERVISOR_TIDAK_DITEMUKAN');
    });

    it('should return 400 if user is not a SUPERVISOR', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: karyawan.id, // KARYAWAN
          siteId: site.id,
        });

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('ROLE_BUKAN_SUPERVISOR');
    });

    it('should return 404 if siteId is not found', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const notFoundSiteId = 'b6666666-6666-4666-a666-666666666666';
      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: supervisor.id,
          siteId: notFoundSiteId,
        });

      expect(res.status).toBe(404);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('SITE_TIDAK_DITEMUKAN');
    });

    it('should successfully create SupervisorSite and return 201', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: supervisor.id,
          siteId: site.id,
        });

      expect(res.status).toBe(201);
      const body = res.body as SuccessEnvelope<{ id: string }>;
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(typeof body.data.id).toBe('string');
    });

    it('should return 409 if assigning the same supervisorId and siteId twice', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supervisorId: supervisor.id,
          siteId: site.id,
        });

      expect(res.status).toBe(409);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('ASSIGNMENT_SUDAH_ADA');
    });
  });

  describe('GET /supervisor-sites', () => {
    beforeAll(async () => {
      // Clean up previous assignments from POST tests
      await prisma.supervisorSite.deleteMany({
        where: { siteId: { in: [site.id, site2.id] } },
      });

      // Create some assignment to be returned by GET
      await prisma.supervisorSite.create({
        data: {
          supervisorId: supervisor.id,
          siteId: site.id,
        },
      });

      await prisma.supervisorSite.create({
        data: {
          supervisorId: supervisor2.id,
          siteId: site2.id,
        },
      });
    });

    afterAll(async () => {
      await prisma.supervisorSite.deleteMany({
        where: { siteId: { in: [site.id, site2.id] } },
      });
    });

    it('should return 403 for KARYAWAN', async () => {
      const token = jwtService.sign({
        userId: karyawan.id,
        role: Role.KARYAWAN,
      });
      const res = await request(app.getHttpServer() as Server)
        .get('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return all assignments for HR_ADMIN (no query param)', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const res = await request(app.getHttpServer() as Server)
        .get('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AssignmentType[]>;
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);

      const assignment1 = body.data.find((d) => d.site.id === site.id);
      expect(assignment1).toBeDefined();
      expect(assignment1!.site.nama).toBe(site.nama);
      expect(assignment1!.site.alamat).toBe(site.alamat);
    });

    it('should return specific supervisor assignments for HR_ADMIN (?supervisorId=X)', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const res = await request(app.getHttpServer() as Server)
        .get(`/supervisor-sites?supervisorId=${supervisor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AssignmentType[]>;
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].site.id).toBe(site.id);
    });

    it('should return empty array for HR_ADMIN if supervisorId has no assignments', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const noAssignmentId = '11111111-2222-4333-a444-555555555555';
      const res = await request(app.getHttpServer() as Server)
        .get(`/supervisor-sites?supervisorId=${noAssignmentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AssignmentType[]>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should return self assignments for SUPERVISOR (no query param)', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const res = await request(app.getHttpServer() as Server)
        .get('/supervisor-sites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AssignmentType[]>;
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].site.id).toBe(site.id);
    });

    it('should override query param for SUPERVISOR and still return self assignments', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      // Supervisor 1 is trying to view Supervisor 2's assignments
      const res = await request(app.getHttpServer() as Server)
        .get(`/supervisor-sites?supervisorId=${supervisor2.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<AssignmentType[]>;
      expect(body.success).toBe(true);
      // It should ignore supervisor2.id and return supervisor 1's assignment
      expect(body.data.length).toBe(1);
      expect(body.data[0].site.id).toBe(site.id); // Not site2.id
    });
  });

  describe('DELETE /supervisor-sites/:id', () => {
    let assignmentId: string;

    beforeAll(async () => {
      // Setup assignment to be deleted
      const assignment = await prisma.supervisorSite.create({
        data: {
          supervisorId: supervisor.id,
          siteId: site.id,
        },
      });
      assignmentId = assignment.id;
    });

    it('should return 403 for SUPERVISOR', async () => {
      const token = jwtService.sign({
        userId: supervisor.id,
        role: Role.SUPERVISOR,
      });
      const res = await request(app.getHttpServer() as Server)
        .delete(`/supervisor-sites/${assignmentId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const res = await request(app.getHttpServer() as Server)
        .delete('/supervisor-sites/not-a-uuid')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent assignment', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const nonExistentId = 'b9999999-9999-4999-a999-999999999999';
      const res = await request(app.getHttpServer() as Server)
        .delete(`/supervisor-sites/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ASSIGNMENT_TIDAK_DITEMUKAN');
    });

    it('should successfully delete assignment and return 200', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });
      const res = await request(app.getHttpServer() as Server)
        .delete(`/supervisor-sites/${assignmentId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<unknown>;
      expect(body.success).toBe(true);

      // Verify deletion
      const check = await prisma.supervisorSite.findUnique({
        where: { id: assignmentId },
      });
      expect(check).toBeNull();
    });
  });
});
