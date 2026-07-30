import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { NotificationsModule } from './notifications.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  SuccessEnvelope,
  ErrorEnvelope,
} from '../../common/types/api-envelope.type';
import { Server } from 'http';

interface NotifikasiResponse {
  id: string;
  tipe: string;
  pesan: string;
  dibaca: boolean;
  createdAt: string;
  userId?: string;
  jadwalId?: string;
}

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenKaryawan1: string;
  let userId1: string;

  let userId2: string;

  let tokenAdmin: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule, NotificationsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup User 1 (Karyawan)
    userId1 = crypto.randomUUID();
    const pw1 = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        id: userId1,
        email: 'user1_notif@test.local',
        passwordHash: pw1,
        nama: 'Karyawan 1',
        role: 'KARYAWAN',
        statusAktif: true,
      },
    });

    // Setup User 2 (Karyawan)
    userId2 = crypto.randomUUID();
    const pw2 = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        id: userId2,
        email: 'user2_notif@test.local',
        passwordHash: pw2,
        nama: 'Karyawan 2',
        role: 'KARYAWAN',
        statusAktif: true,
      },
    });

    // Setup Admin
    adminId = crypto.randomUUID();
    const pwA = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        id: adminId,
        email: 'admin_notif@test.local',
        passwordHash: pwA,
        nama: 'Admin',
        role: 'HR_ADMIN',
        statusAktif: true,
      },
    });

    const loginRes1 = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({ email: 'user1_notif@test.local', password: 'password123' })
      .expect(200);
    tokenKaryawan1 = (
      loginRes1.body as SuccessEnvelope<{ accessToken: string }>
    ).data.accessToken;

    const loginResA = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({ email: 'admin_notif@test.local', password: 'password123' })
      .expect(200);
    tokenAdmin = (loginResA.body as SuccessEnvelope<{ accessToken: string }>)
      .data.accessToken;
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      await prisma.notifikasi.deleteMany({
        where: { userId: { in: [userId1, userId2, adminId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userId1, userId2, adminId] } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /notifications', () => {
    beforeEach(async () => {
      // Clear before each
      await prisma.notifikasi.deleteMany({
        where: { userId: { in: [userId1, userId2] } },
      });
    });

    it('hanya return notifikasi milik user yang login, TIDAK termasuk milik user lain', async () => {
      // Create for user1
      await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId1,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Halo U1',
        },
      });

      // Create for user2
      await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId2,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Halo U2',
        },
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/notifications')
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(200);

      const body = res.body as SuccessEnvelope<Array<NotifikasiResponse>>;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].pesan).toBe('Halo U1');
    });

    it('urutan createdAt descending (paling baru di index 0)', async () => {
      // Older
      await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId1,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Old Notif',
          createdAt: new Date('2026-07-30T10:00:00Z'),
        },
      });

      // Newer
      await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId1,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'New Notif',
          createdAt: new Date('2026-07-30T11:00:00Z'),
        },
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/notifications')
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(200);

      const body = res.body as SuccessEnvelope<Array<NotifikasiResponse>>;
      expect(body.data).toHaveLength(2);
      expect(body.data[0].pesan).toBe('New Notif');
      expect(body.data[1].pesan).toBe('Old Notif');
    });

    it('response cuma berisi 5 field yang didokumentasikan, tidak ada jadwalId/userId bocor', async () => {
      const id = crypto.randomUUID();
      await prisma.notifikasi.create({
        data: {
          id,
          userId: userId1,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Test payload',
        },
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/notifications')
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(200);

      const body = res.body as SuccessEnvelope<Array<NotifikasiResponse>>;
      const item = body.data[0];

      expect(Object.keys(item).sort()).toEqual(
        ['createdAt', 'dibaca', 'id', 'pesan', 'tipe'].sort(),
      );
      expect(item.userId).toBeUndefined();
      expect(item.jadwalId).toBeUndefined();
    });

    it('role HR_ADMIN ditolak (403)', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get('/notifications')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(403);

      const body = res.body as ErrorEnvelope;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AKSES_DITOLAK');
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    beforeEach(async () => {
      await prisma.notifikasi.deleteMany({
        where: { userId: { in: [userId1, userId2] } },
      });
    });

    it('berhasil set dibaca:true untuk notifikasi milik sendiri', async () => {
      const notif = await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId1,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Halo',
        },
      });

      const res = await request(app.getHttpServer() as Server)
        .patch(`/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(200);

      const body = res.body as SuccessEnvelope<{ success: boolean }>;
      expect(body.data.success).toBe(true);

      const check = await prisma.notifikasi.findUnique({
        where: { id: notif.id },
      });
      expect(check?.dibaca).toBe(true);
    });

    it('404 kalau id tidak ada sama sekali', async () => {
      const fakeId = crypto.randomUUID();
      const res = await request(app.getHttpServer() as Server)
        .patch(`/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(404);

      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('404 kalau id ada tapi milik user lain (bukan 403)', async () => {
      const notifU2 = await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId2,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Milik U2',
        },
      });

      // U1 tries to patch U2's notification
      const res = await request(app.getHttpServer() as Server)
        .patch(`/notifications/${notifU2.id}/read`)
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(404);

      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('400 kalau id bukan format UUID valid', async () => {
      const res = await request(app.getHttpServer() as Server)
        .patch(`/notifications/not-uuid/read`)
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(400);

      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('role HR_ADMIN ditolak (403)', async () => {
      const id = crypto.randomUUID();
      const res = await request(app.getHttpServer() as Server)
        .patch(`/notifications/${id}/read`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(403);

      const body = res.body as ErrorEnvelope;
      expect(body.error.code).toBe('AKSES_DITOLAK');
    });

    it('idempotent — dipanggil 2x pada notifikasi yang sama tetap sukses di kedua panggilan', async () => {
      const notif = await prisma.notifikasi.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId1,
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Idempotent',
        },
      });

      // 1st call
      await request(app.getHttpServer() as Server)
        .patch(`/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(200);

      // 2nd call
      await request(app.getHttpServer() as Server)
        .patch(`/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${tokenKaryawan1}`)
        .expect(200);

      const check = await prisma.notifikasi.findUnique({
        where: { id: notif.id },
      });
      expect(check?.dibaca).toBe(true);
    });
  });
});
