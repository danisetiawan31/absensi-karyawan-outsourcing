import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'net';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { ThrottlerStorage } from '@nestjs/throttler';
import { CacheService } from '../../common/cache/cache.service';
import { ErrorEnvelope } from '../../common/types/api-envelope.type';

describe('Auth Rate Limiting (Track M: redis-rate-limiting-auth)', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  const testTrackId = 'rate-limit-test-' + Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    cacheService = app.get<CacheService>(CacheService);
  });

  beforeEach(async () => {
    if (cacheService) {
      await cacheService.delByPattern('*{*:default}:*');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login rate limit (5 requests / 60s per IP)', () => {
    it('should allow requests 1 to 5, and block request 6 with 429 TERLALU_BANYAK_PERCOBAAN', async () => {
      // Attempts 1 to 5: Guard should pass
      for (let i = 1; i <= 5; i++) {
        const res = await request(app.getHttpServer() as Server)
          .post('/auth/login')
          .send({
            email: `test-rl-${testTrackId}@test.local`,
            password: 'wrongpassword',
          });

        expect(res.status).not.toBe(429);
      }

      // Attempt 6: Guard should reject with 429
      const res6 = await request(app.getHttpServer() as Server)
        .post('/auth/login')
        .send({
          email: `test-rl-${testTrackId}@test.local`,
          password: 'wrongpassword',
        });

      expect(res6.status).toBe(429);
      const body = res6.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TERLALU_BANYAK_PERCOBAAN');
      expect(body.error.message).toBe(
        'Terlalu banyak percobaan, coba lagi nanti',
      );
      expect(body.meta).toBeDefined();
    });
  });

  describe('POST /auth/forgot-password rate limit (3 requests / 300s per IP)', () => {
    it('should allow requests 1 to 3, and block request 4 with 429 TERLALU_BANYAK_PERCOBAAN', async () => {
      // Attempts 1 to 3: Guard should pass
      for (let i = 1; i <= 3; i++) {
        const res = await request(app.getHttpServer() as Server)
          .post('/auth/forgot-password')
          .send({ email: `fp-rl-${testTrackId}@test.local` });

        expect(res.status).not.toBe(429);
      }

      // Attempt 4: Guard should reject with 429
      const res4 = await request(app.getHttpServer() as Server)
        .post('/auth/forgot-password')
        .send({ email: `fp-rl-${testTrackId}@test.local` });

      expect(res4.status).toBe(429);
      const body = res4.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TERLALU_BANYAK_PERCOBAAN');
      expect(body.error.message).toBe(
        'Terlalu banyak percobaan, coba lagi nanti',
      );
    });
  });

  describe('Fail-Open Resilience (Redis storage error simulation)', () => {
    it('should allow request through (fail-open) when Redis storage throws an error', async () => {
      const storage = app.get<ThrottlerStorage>(ThrottlerStorage);
      const incrementSpy = jest
        .spyOn(storage, 'increment')
        .mockRejectedValueOnce(new Error('Redis connection timeout simulated'));

      const res = await request(app.getHttpServer() as Server)
        .post('/auth/login')
        .send({
          email: `fail-open-${testTrackId}@test.local`,
          password: 'password',
        });

      // Should NOT be 429 or 500, request fails-open to normal auth logic
      expect(res.status).not.toBe(429);
      expect(res.status).not.toBe(500);

      incrementSpy.mockRestore();
    });
  });

  describe('Negative assertion (Endpoints outside auth rate limit scope)', () => {
    it('should NOT apply rate limit guard to un-guarded endpoints like GET /schedules/today', async () => {
      // Fire 10 consecutive requests on GET /schedules/today without token
      for (let i = 1; i <= 10; i++) {
        const res = await request(app.getHttpServer() as Server).get(
          '/schedules/today',
        );

        // Without auth token it returns 401 Unauthorized, but NEVER 429
        expect(res.status).toBe(401);
        expect(res.status).not.toBe(429);
      }
    });
  });
});
