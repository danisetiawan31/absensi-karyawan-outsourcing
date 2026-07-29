import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              accessToken: 'mock-token',
              role: Role.KARYAWAN,
              userId: 'user-id',
              nama: 'Test User',
            }),
            forgotPassword: jest.fn().mockResolvedValue(undefined),
            resetPassword: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return login response from AuthService', async () => {
      const loginDto = { email: 'test@test.local', password: 'password123' };
      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({
        accessToken: 'mock-token',
        role: Role.KARYAWAN,
        userId: 'user-id',
        nama: 'Test User',
      });
    });
  });

  describe('resetPassword', () => {
    it('should return { success: true } and call service.resetPassword', async () => {
      const dto = {
        email: 'test@test.com',
        token: '123456',
        passwordBaru: 'newpass123',
      };
      const result = await controller.resetPassword(dto);

      expect(service.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true });
    });
  });
});
