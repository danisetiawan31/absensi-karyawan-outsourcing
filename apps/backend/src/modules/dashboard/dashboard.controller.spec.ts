import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { Role, User, Site } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import { SuccessEnvelope } from '../../common/types/api-envelope.type';
import { DashboardAttendanceItem } from './dashboard.service';
import { randomUUID } from 'crypto';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const trackId = `dash-ctrl-${randomUUID()}`;

  let hrAdmin: User;
  let supervisor: User;
  let karyawan: User;
  let site: Site;

  const testDate = '2026-09-20';

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
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create users for auth testing
    hrAdmin = await prisma.user.create({
      data: {
        email: `hr-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'HR Admin',
        role: Role.HR_ADMIN,
      },
    });

    supervisor = await prisma.user.create({
      data: {
        email: `sup-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Supervisor',
        role: Role.SUPERVISOR,
      },
    });

    karyawan = await prisma.user.create({
      data: {
        email: `emp-${trackId}@test.local`,
        passwordHash: 'dummy',
        nama: 'Karyawan',
        role: Role.KARYAWAN,
      },
    });

    site = await prisma.site.create({
      data: {
        nama: `Site Dash Ctrl ${trackId}`,
        alamat: 'Alamat',
        latitude: -6.2,
        longitude: 106.8,
      },
    });

    await prisma.supervisorSite.create({
      data: {
        supervisorId: supervisor.id,
        siteId: site.id,
      },
    });

    // Create a schedule for supervisor's site
    await prisma.jadwalShift.create({
      data: {
        karyawanId: karyawan.id,
        siteId: site.id,
        tanggal: new Date(`${testDate}T00:00:00+07:00`),
        jamMulai: new Date(`${testDate}T08:00:00+07:00`),
        jamSelesai: new Date(`${testDate}T16:00:00+07:00`),
      },
    });
  });

  afterAll(async () => {
    await prisma.jadwalShift.deleteMany({
      where: { siteId: site.id },
    });
    await prisma.supervisorSite.deleteMany({
      where: { supervisorId: supervisor.id },
    });
    await prisma.site.deleteMany({
      where: { id: site.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [hrAdmin.id, supervisor.id, karyawan.id] } },
    });
    await app.close();
  });

  it('should return 401 if request has no token', async () => {
    const res = await request(app.getHttpServer() as Server).get(
      `/dashboard/attendance?tanggal=${testDate}`,
    );

    expect(res.status).toBe(401);
  });

  it('should return 403 if caller role is KARYAWAN', async () => {
    const token = jwtService.sign({
      userId: karyawan.id,
      role: Role.KARYAWAN,
    });

    const res = await request(app.getHttpServer() as Server)
      .get(`/dashboard/attendance?tanggal=${testDate}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should return 403 if caller role is HR_ADMIN', async () => {
    const token = jwtService.sign({
      userId: hrAdmin.id,
      role: Role.HR_ADMIN,
    });

    const res = await request(app.getHttpServer() as Server)
      .get(`/dashboard/attendance?tanggal=${testDate}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should return 400 if tanggal format is invalid (not YYYY-MM-DD)', async () => {
    const token = jwtService.sign({
      userId: supervisor.id,
      role: Role.SUPERVISOR,
    });

    const res = await request(app.getHttpServer() as Server)
      .get('/dashboard/attendance?tanggal=20-09-2026')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('should return 400 if tanggal query parameter is missing', async () => {
    const token = jwtService.sign({
      userId: supervisor.id,
      role: Role.SUPERVISOR,
    });

    const res = await request(app.getHttpServer() as Server)
      .get('/dashboard/attendance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('should return 200 with raw array of dashboard attendance data for SUPERVISOR', async () => {
    const token = jwtService.sign({
      userId: supervisor.id,
      role: Role.SUPERVISOR,
    });

    const res = await request(app.getHttpServer() as Server)
      .get(`/dashboard/attendance?tanggal=${testDate}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const body = res.body as SuccessEnvelope<DashboardAttendanceItem[]>;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].karyawan).toBe(karyawan.nama);
    expect(body.data[0].site).toBe(site.nama);
    expect(body.data[0].status).toBe('BELUM');
  });
});
