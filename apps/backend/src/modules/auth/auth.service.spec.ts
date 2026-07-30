import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const testEmail = 'test_auth_service@test.local';
  const testPassword = 'password123';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PrismaService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);

    // Bersihkan data test jika ada sisa dari test sebelumnya
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(testPassword, saltRounds);

    await prisma.user.create({
      data: {
        nama: 'Test User',
        email: testEmail,
        passwordHash,
        role: Role.KARYAWAN,
        faceEmbedding: [],
      },
    });
  });

  afterAll(async () => {
    // Bersihkan data setelah test selesai
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });
      await prisma.$disconnect();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('sukses login dengan email dan password valid', async () => {
      const result = await service.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.role).toBe(Role.KARYAWAN);
    });

    it('gagal login dengan email tidak terdaftar (KREDENSIAL_SALAH)', async () => {
      await expect(
        service.login({
          email: 'notfound@test.local',
          password: testPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({
          email: 'notfound@test.local',
          password: testPassword,
        }),
      ).rejects.toMatchObject({
        response: { code: 'KREDENSIAL_SALAH' },
      });
    });

    it('gagal login dengan password salah (KREDENSIAL_SALAH)', async () => {
      await expect(
        service.login({
          email: testEmail,
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({
          email: testEmail,
          password: 'wrongpassword',
        }),
      ).rejects.toMatchObject({
        response: { code: 'KREDENSIAL_SALAH' },
      });
    });
  });

  describe('resetPassword', () => {
    const validToken = '123456';
    const hashedToken = crypto
      .createHash('sha256')
      .update(validToken)
      .digest('hex');

    beforeEach(async () => {
      await prisma.user.update({
        where: { email: testEmail },
        data: {
          resetToken: hashedToken,
          resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 mins future
          wajibGantiPassword: true,
        },
      });
    });

    it('sukses reset password, nullifikasi token, & unflag wajib ganti', async () => {
      await service.resetPassword({
        email: testEmail,
        token: validToken,
        passwordBaru: 'newpassword123',
      });

      const updatedUser = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser!.resetToken).toBeNull();
      expect(updatedUser!.resetTokenExpiry).toBeNull();
      expect(updatedUser!.wajibGantiPassword).toBe(false);

      const isMatch = await bcrypt.compare(
        'newpassword123',
        updatedUser!.passwordHash,
      );
      expect(isMatch).toBe(true);
    });

    it('gagal (400) jika email tidak ditemukan (pesan error identik TOKEN_TIDAK_VALID)', async () => {
      const call = service.resetPassword({
        email: 'invalid@test.local',
        token: validToken,
        passwordBaru: 'newpassword123',
      });
      await expect(call).rejects.toThrow(BadRequestException);
      await expect(call).rejects.toMatchObject({
        response: {
          code: 'TOKEN_TIDAK_VALID',
          message: 'Kode reset tidak valid atau sudah kedaluwarsa',
        },
      });
    });

    it('gagal (400) jika token salah', async () => {
      const call = service.resetPassword({
        email: testEmail,
        token: '000000',
        passwordBaru: 'newpassword123',
      });
      await expect(call).rejects.toThrow(BadRequestException);
      await expect(call).rejects.toMatchObject({
        response: { code: 'TOKEN_TIDAK_VALID' },
      });
    });

    it('gagal (400) jika token kedaluwarsa', async () => {
      await prisma.user.update({
        where: { email: testEmail },
        data: {
          resetTokenExpiry: new Date(Date.now() - 15 * 60 * 1000), // past
        },
      });

      const call = service.resetPassword({
        email: testEmail,
        token: validToken,
        passwordBaru: 'newpassword123',
      });
      await expect(call).rejects.toThrow(BadRequestException);
      await expect(call).rejects.toMatchObject({
        response: { code: 'TOKEN_TIDAK_VALID' },
      });
    });
  });
});
