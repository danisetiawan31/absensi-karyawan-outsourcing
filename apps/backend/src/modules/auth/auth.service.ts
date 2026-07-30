import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'KREDENSIAL_SALAH',
        message: 'Email atau password salah',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'KREDENSIAL_SALAH',
        message: 'Email atau password salah',
      });
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto);

    const payload = { userId: user.id, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      role: user.role,
      userId: user.id,
      nama: user.nama,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.statusAktif) {
      return;
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedCode,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: 'Kode Reset Password',
        text: `Kode verifikasi Anda adalah: ${code}. Kode ini berlaku selama 15 menit.`,
      });
    } catch (error) {
      this.logger.error('Failed to send reset email', error);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const invalidTokenException = new BadRequestException({
      code: 'TOKEN_TIDAK_VALID',
      message: 'Kode reset tidak valid atau sudah kedaluwarsa',
    });

    if (!user) {
      throw invalidTokenException;
    }

    if (!user.resetToken || !user.resetTokenExpiry) {
      throw invalidTokenException;
    }

    const hashedInputToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    if (hashedInputToken !== user.resetToken) {
      throw invalidTokenException;
    }

    if (new Date() > user.resetTokenExpiry) {
      throw invalidTokenException;
    }

    const passwordHash = await bcrypt.hash(dto.passwordBaru, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        wajibGantiPassword: false,
      },
    });
  }
}
