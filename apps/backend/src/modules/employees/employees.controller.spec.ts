import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'http';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';

interface EmployeeResponse {
  id: string;
  nama: string;
  email: string;
  role: string;
  statusAktif: boolean;
  wajahTerdaftar?: boolean;
  passwordSementara?: string;
  createdAt?: string;
}

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let hrAdmin: User;
  let karyawan1: User;
  let karyawan2: User;

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
    hrAdmin = await prisma.user.create({
      data: {
        id: 'test-hr-id',
        email: 'hr@emp-test.com',
        passwordHash: 'dummy',
        nama: 'Asep HR',
        role: Role.HR_ADMIN,
        statusAktif: true,
      },
    });

    karyawan1 = await prisma.user.create({
      data: {
        id: 'test-emp1-id',
        email: 'emp1@emp-test.com',
        passwordHash: 'dummy',
        nama: 'Budi Karyawan',
        role: Role.KARYAWAN,
        statusAktif: true,
        faceEmbedding: [0.1, 0.2], // Wajah terdaftar
      },
    });

    karyawan2 = await prisma.user.create({
      data: {
        id: 'test-emp2-id',
        email: 'emp2@emp-test.com',
        passwordHash: 'dummy',
        nama: 'Caca Karyawan',
        role: Role.KARYAWAN,
        statusAktif: false, // Nonaktif
        faceEmbedding: [], // Wajah belum terdaftar
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { id: { in: ['test-hr-id', 'test-emp1-id', 'test-emp2-id'] } },
      });
      // Cleanup newly created test user if any
      await prisma.user.deleteMany({
        where: { email: 'new-employee@emp-test.com' },
      });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('GET /employees', () => {
    it('should forbid non-HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: karyawan1.id,
        role: Role.KARYAWAN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/employees')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return all employees if no query provided', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/employees')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<EmployeeResponse[]>;
      expect(body.success).toBe(true);

      // Verify our dummy users exist in the response
      const ids = body.data.map((u) => u.id);
      expect(ids).toContain(hrAdmin.id);
      expect(ids).toContain(karyawan1.id);
      expect(ids).toContain(karyawan2.id);

      // Verify sensitive fields are excluded
      const user = body.data[0];
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('resetToken');
      expect(user).not.toHaveProperty('faceEmbedding');

      // Verify wajahTerdaftar is derived correctly
      const emp1 = body.data.find((u) => u.id === karyawan1.id);
      expect(emp1?.wajahTerdaftar).toBe(true);

      const emp2 = body.data.find((u) => u.id === karyawan2.id);
      expect(emp2?.wajahTerdaftar).toBe(false);
    });

    it('should filter by role=KARYAWAN', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/employees?role=KARYAWAN')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<EmployeeResponse[]>;

      const roles = body.data.map((u) => u.role);
      expect(roles.every((r) => r === 'KARYAWAN')).toBe(true);

      const ids = body.data.map((u) => u.id);
      expect(ids).toContain(karyawan1.id);
      expect(ids).toContain(karyawan2.id);
      expect(ids).not.toContain(hrAdmin.id);
    });

    it('should filter by statusAktif=false', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/employees?statusAktif=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<EmployeeResponse[]>;

      const statusList = body.data.map((u) => u.statusAktif);
      expect(statusList.every((s) => s === false)).toBe(true);

      const ids = body.data.map((u) => u.id);
      expect(ids).toContain(karyawan2.id);
      expect(ids).not.toContain(karyawan1.id);
    });

    it('should filter by search=asep (case-insensitive partial match)', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/employees?search=asep')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<EmployeeResponse[]>;

      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(hrAdmin.id);
    });

    it('should return 400 if role query is invalid', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/employees?role=INVALID_ROLE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /employees/:id', () => {
    it('should forbid non-HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: karyawan1.id,
        role: Role.KARYAWAN,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/employees/${karyawan1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nama: 'Updated Name' });

      expect(res.status).toBe(403);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 if employee not found', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch('/employees/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama: 'Updated Name' });

      expect(res.status).toBe(404);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should partially update employee (e.g. name only)', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const originalEmail = karyawan1.email;

      const res = await request(app.getHttpServer() as Server)
        .patch(`/employees/${karyawan1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nama: 'Nama Baru Budi' });

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<EmployeeResponse>;
      expect(body.success).toBe(true);

      // Verify returned object
      expect(body.data.nama).toBe('Nama Baru Budi');
      expect(body.data.email).toBe(originalEmail); // Email didn't change
      expect(body.data.statusAktif).toBe(true);

      // Verify sensitive fields are excluded
      expect(body.data).not.toHaveProperty('passwordHash');
      expect(body.data).not.toHaveProperty('faceEmbedding');
    });

    it('should update statusAktif to false', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/employees/${karyawan1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statusAktif: false });

      expect(res.status).toBe(200);
      const body = res.body as SuccessEnvelope<EmployeeResponse>;
      expect(body.success).toBe(true);
      expect(body.data.statusAktif).toBe(false);
    });

    it('should throw 409 if email is already in use by another user', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/employees/${karyawan1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: karyawan2.email }); // Try to steal karyawan2's email

      expect(res.status).toBe(409);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
    });
  });

  describe('POST /employees', () => {
    beforeAll(async () => {
      // Restore karyawan1 statusAktif to true for subsequent tests
      await prisma.user.update({
        where: { id: karyawan1.id },
        data: { statusAktif: true },
      });
    });

    it('should forbid non-HR_ADMIN', async () => {
      const token = jwtService.sign({
        userId: karyawan1.id,
        role: Role.KARYAWAN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nama: 'Test',
          email: 'test@emp-test.com',
          role: Role.KARYAWAN,
        });

      expect(res.status).toBe(403);
    });

    it('should validate inputs (empty fields)', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nama: '', // empty
          email: 'invalid-email',
          role: 'INVALID_ROLE',
        });

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');

      const details = body.error.details as Array<{
        field: string;
        issue: string;
      }>;
      const fields = details?.map((d) => d.field);
      expect(fields).toContain('nama');
      expect(fields).toContain('email');
      expect(fields).toContain('role');
    });

    it('should successfully create employee and return valid passwordSementara', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const email = 'new-employee@emp-test.com';

      const res = await request(app.getHttpServer() as Server)
        .post('/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nama: 'New Employee',
          email: email,
          role: Role.KARYAWAN,
        });

      expect(res.status).toBe(201);
      const body = res.body as SuccessEnvelope<EmployeeResponse>;
      expect(body.success).toBe(true);

      const data = body.data;
      expect(data.nama).toBe('New Employee');
      expect(data.email).toBe(email);
      expect(data.role).toBe(Role.KARYAWAN);
      expect(data.statusAktif).toBe(true);
      expect(data).toHaveProperty('createdAt');

      // sensitive field check
      expect(data).not.toHaveProperty('passwordHash');

      // password check
      expect(data.passwordSementara).toBeDefined();
      expect(typeof data.passwordSementara).toBe('string');
      expect(data.passwordSementara?.length).toBe(8);

      // Verify db user
      const dbUser = await prisma.user.findUnique({
        where: { email },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.wajibGantiPassword).toBe(true);
      expect(dbUser?.statusAktif).toBe(true);

      // Verify faceEmbedding is empty array natively
      expect(dbUser?.faceEmbedding).toEqual([]);

      // Verify hash
      if (dbUser && data.passwordSementara) {
        const isMatch = await bcrypt.compare(
          data.passwordSementara,
          dbUser.passwordHash,
        );
        expect(isMatch).toBe(true);
      }
    });

    it('should throw 409 if email is already in use by another user', async () => {
      const token = jwtService.sign({
        userId: hrAdmin.id,
        role: Role.HR_ADMIN,
      });

      const res = await request(app.getHttpServer() as Server)
        .post('/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nama: 'Clone',
          email: karyawan2.email, // already exists
          role: Role.SUPERVISOR,
        });

      expect(res.status).toBe(409);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('EMAIL_SUDAH_DIPAKAI');
    });
  });
});
