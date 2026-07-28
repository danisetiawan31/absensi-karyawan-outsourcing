import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

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

    it('gagal login dengan email tidak terdaftar (UNAUTHORIZED)', async () => {
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
        response: { code: 'UNAUTHORIZED' },
      });
    });

    it('gagal login dengan password salah (UNAUTHORIZED)', async () => {
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
        response: { code: 'UNAUTHORIZED' },
      });
    });
  });
});
