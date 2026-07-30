import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import request from 'supertest';
import { Role, User } from '@prisma/client';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { RequestIdMiddleware } from '../../common/middlewares/request-id.middleware';
import { FaceVerificationService } from './face-verification.service';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';
import { randomUUID } from 'crypto';

describe('FaceVerificationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let faceVerificationService: FaceVerificationService;

  let karyawanUser: User;
  let supervisorUser: User;
  let karyawanToken: string;
  let supervisorToken: string;

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

    embedFaceSpy = jest.spyOn(faceVerificationService, 'embedFace');

    const testId = 'face-verif-test';

    await prisma.user.deleteMany({
      where: {
        email: { contains: testId },
      },
    });

    karyawanUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `karyawan-${testId}@example.com`,
        nama: 'Karyawan Face Verif',
        passwordHash: 'hash',
        role: Role.KARYAWAN,
        statusAktif: true,
        faceEmbedding: [],
      },
    });
    karyawanToken = jwtService.sign({
      userId: karyawanUser.id,
      role: karyawanUser.role,
    });

    supervisorUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `spv-${testId}@example.com`,
        nama: 'Spv Face Verif',
        passwordHash: 'hash',
        role: Role.SUPERVISOR,
        statusAktif: true,
      },
    });
    supervisorToken = jwtService.sign({
      userId: supervisorUser.id,
      role: supervisorUser.role,
    });
  });

  afterAll(async () => {
    const testId = 'face-verif-test';
    await prisma.user.deleteMany({
      where: {
        email: { contains: testId },
      },
    });
    await app.close();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await prisma.user.update({
      where: { id: karyawanUser.id },
      data: { faceEmbedding: [] },
    });
  });

  describe('POST /users/me/face-registration', () => {
    it('Skenario 1: User (KARYAWAN) upload foto valid -> sukses, db terupdate', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      embedFaceSpy.mockResolvedValue({
        embedding: mockEmbedding,
        liveness: { isLive: true, confidence: 0.99 },
      });

      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .attach('foto', Buffer.from('dummy image data'), 'foto.jpg');

      expect(res.status).toBe(201);
      const body = res.body as SuccessEnvelope<{ id: string }>;
      expect(body.success).toBe(true);

      const userDb = await prisma.user.findUnique({
        where: { id: karyawanUser.id },
      });
      expect(userDb?.faceEmbedding).toEqual(mockEmbedding);
      expect(embedFaceSpy).toHaveBeenCalledTimes(1);
    });

    it('Skenario 2: User yang faceEmbedding-nya SUDAH terisi upload foto -> 409, db tidak berubah', async () => {
      const initialEmbedding = [0.9, 0.8, 0.7];
      await prisma.user.update({
        where: { id: karyawanUser.id },
        data: { faceEmbedding: initialEmbedding },
      });

      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .attach('foto', Buffer.from('dummy image data'), 'foto.jpg');

      expect(res.status).toBe(409);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('WAJAH_SUDAH_TERDAFTAR');

      const userDb = await prisma.user.findUnique({
        where: { id: karyawanUser.id },
      });
      expect(userDb?.faceEmbedding).toEqual(initialEmbedding);
      expect(embedFaceSpy).not.toHaveBeenCalled();
    });

    it('Skenario 3: Request tanpa file foto -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`);

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FOTO_WAJIB_DIUNGGAH');
    });

    it('Skenario 4: Upload file bukan format image -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .attach('foto', Buffer.from('dummy txt data'), 'document.pdf');

      expect(res.status).toBe(400);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORMAT_FILE_TIDAK_VALID');
    });

    it('Skenario 5: Upload file melebihi 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .attach('foto', largeBuffer, 'large.jpg');

      expect(res.status).toBe(413);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('Skenario 6: Mock embedFace reject dengan exception WAJAH_TIDAK_TERDETEKSI -> 422, db tidak berubah', async () => {
      embedFaceSpy.mockRejectedValue(
        new HttpException(
          { code: 'WAJAH_TIDAK_TERDETEKSI', message: 'Wajah tidak terdeteksi' },
          422,
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .attach('foto', Buffer.from('dummy image data'), 'foto.jpg');

      expect(res.status).toBe(422);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('WAJAH_TIDAK_TERDETEKSI');

      const userDb = await prisma.user.findUnique({
        where: { id: karyawanUser.id },
      });
      expect(userDb?.faceEmbedding).toEqual([]);
    });

    it('Skenario 7: Mock embedFace reject FACE_SERVICE_UNAVAILABLE -> 503, db tidak berubah', async () => {
      embedFaceSpy.mockRejectedValue(
        new HttpException(
          { code: 'FACE_SERVICE_UNAVAILABLE', message: 'Service down' },
          503,
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${karyawanToken}`)
        .attach('foto', Buffer.from('dummy image data'), 'foto.jpg');

      expect(res.status).toBe(503);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FACE_SERVICE_UNAVAILABLE');

      const userDb = await prisma.user.findUnique({
        where: { id: karyawanUser.id },
      });
      expect(userDb?.faceEmbedding).toEqual([]);
    });

    it('Skenario 8: Request dari role selain KARYAWAN (SUPERVISOR) -> 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .attach('foto', Buffer.from('dummy image data'), 'foto.jpg');

      expect(res.status).toBe(403);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AKSES_DITOLAK');
    });

    it('Skenario 9: Request tanpa JWT token -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/face-registration')
        .attach('foto', Buffer.from('dummy image data'), 'foto.jpg');

      expect(res.status).toBe(401);
      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
