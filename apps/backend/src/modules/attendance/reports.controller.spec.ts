import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { Role, User } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import { randomUUID } from 'crypto';

describe('ReportsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let hrUser: User;
  let supervisorUser: User;
  let hrToken: string;
  let supervisorToken: string;

  const periodeMulai = '2026-11-01';
  const periodeSelesai = '2026-11-05';

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

    hrUser = await prisma.user.create({
      data: {
        email: `hr-rpt-ctrl-${randomUUID()}@test.com`,
        passwordHash: 'hashed',
        nama: 'HR Admin Reports Test',
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
        email: `sup-rpt-ctrl-${randomUUID()}@test.com`,
        passwordHash: 'hashed',
        nama: 'Supervisor Reports Test',
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
    await app.close();
  });

  it('should return 401 if request has no token', async () => {
    const res = await request(app.getHttpServer() as Server).get(
      `/reports/export?format=xlsx&periodeMulai=${periodeMulai}&periodeSelesai=${periodeSelesai}`,
    );

    expect(res.status).toBe(401);
  });

  it('should return 403 if caller role is not HR_ADMIN', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get(
        `/reports/export?format=xlsx&periodeMulai=${periodeMulai}&periodeSelesai=${periodeSelesai}`,
      )
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 400 if format is not pdf or xlsx', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get(
        `/reports/export?format=doc&periodeMulai=${periodeMulai}&periodeSelesai=${periodeSelesai}`,
      )
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 400 if tanggal format is invalid', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get(
        `/reports/export?format=xlsx&periodeMulai=01-11-2026&periodeSelesai=${periodeSelesai}`,
      )
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 200 with XLSX headers and binary content for HR_ADMIN', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get(
        `/reports/export?format=xlsx&periodeMulai=${periodeMulai}&periodeSelesai=${periodeSelesai}`,
      )
      .set('Authorization', `Bearer ${hrToken}`)
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toContain(
      `attachment; filename="laporan-kehadiran_${periodeMulai}_${periodeSelesai}.xlsx"`,
    );
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).length).toBeGreaterThan(0);
  });

  it('should return 200 with PDF headers and binary content for HR_ADMIN', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get(
        `/reports/export?format=pdf&periodeMulai=${periodeMulai}&periodeSelesai=${periodeSelesai}`,
      )
      .set('Authorization', `Bearer ${hrToken}`)
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(
      `attachment; filename="laporan-kehadiran_${periodeMulai}_${periodeSelesai}.pdf"`,
    );
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).length).toBeGreaterThan(0);
  });
});
