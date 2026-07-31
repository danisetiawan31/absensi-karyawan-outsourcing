import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FindEmployeesQueryDto } from './dto/find-employees-query.dto';
import { Prisma, Role, StatusIzin } from '@prisma/client';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  getJakartaDateRange,
  getJakartaSingleDayRange,
  getJakartaStartOfDay,
} from '../../common/utils/date.util';

type EmployeeSelectData = {
  id: string;
  nama: string;
  email: string;
  role: Role;
  statusAktif: boolean;
  faceEmbedding: number[];
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindEmployeesQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.statusAktif !== undefined) {
      where.statusAktif = query.statusAktif;
    }

    if (query.search) {
      where.OR = [
        { nama: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        statusAktif: true,
        faceEmbedding: true,
      },
      orderBy: { nama: 'asc' }, // consistent with sites
    });

    return users.map((u) => this.mapToResponse(u));
  }

  async findAvailableEmployees(
    tanggal: string,
    siteId: string,
    user: { id: string; role: Role },
  ) {
    if (user.role === Role.SUPERVISOR) {
      const isAssigned = await this.prisma.supervisorSite.findUnique({
        where: {
          supervisorId_siteId: {
            supervisorId: user.id,
            siteId,
          },
        },
      });

      if (!isAssigned) {
        return [];
      }
    }

    const { gte: startOfDay, lt: nextDay } = getJakartaSingleDayRange(tanggal);

    const users = await this.prisma.user.findMany({
      where: {
        role: Role.KARYAWAN,
        statusAktif: true,
        jadwalShift: {
          none: {
            tanggal: {
              gte: startOfDay,
              lt: nextDay,
            },
          },
        },
        pengajuanIzin: {
          none: {
            status: StatusIzin.APPROVED,
            tanggalMulai: { lt: nextDay },
            tanggalSelesai: { gte: startOfDay },
          },
        },
      },
      select: {
        id: true,
        nama: true,
      },
      orderBy: { nama: 'asc' },
    });

    return users;
  }

  async findEmployeeSchedules(
    karyawanId: string,
    tanggalMulai: string,
    tanggalSelesai: string,
  ) {
    const karyawan = await this.prisma.user.findUnique({
      where: { id: karyawanId },
      select: { id: true, role: true, statusAktif: true },
    });

    if (!karyawan || karyawan.role !== Role.KARYAWAN || !karyawan.statusAktif) {
      throw new NotFoundException({
        code: 'KARYAWAN_TIDAK_DITEMUKAN',
        message: 'Karyawan tidak ditemukan',
      });
    }

    const startMulai = getJakartaStartOfDay(tanggalMulai);
    const startSelesai = getJakartaStartOfDay(tanggalSelesai);

    if (startMulai > startSelesai) {
      throw new BadRequestException({
        code: 'RENTANG_TANGGAL_TIDAK_VALID',
        message: 'tanggalMulai tidak boleh lebih besar dari tanggalSelesai',
      });
    }

    const { gte: startDate, lt: endDate } = getJakartaDateRange(
      tanggalMulai,
      tanggalSelesai,
    );

    const jadwals = await this.prisma.jadwalShift.findMany({
      where: {
        karyawanId,
        tanggal: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        tanggal: true,
        jamMulai: true,
        jamSelesai: true,
        site: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
      orderBy: [{ tanggal: 'asc' }, { jamMulai: 'asc' }],
    });

    return jadwals.map((j) => ({
      jadwalId: j.id,
      tanggal: j.tanggal,
      jamMulai: j.jamMulai,
      jamSelesai: j.jamSelesai,
      site: {
        id: j.site.id,
        nama: j.site.nama,
      },
    }));
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    const passwordSementara = this.generateRandomPassword(8);
    const passwordHash = await bcrypt.hash(passwordSementara, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          nama: createEmployeeDto.nama,
          email: createEmployeeDto.email,
          role: createEmployeeDto.role,
          passwordHash,
          wajibGantiPassword: true,
          statusAktif: true,
          faceEmbedding: [],
        },
        select: {
          id: true,
          nama: true,
          email: true,
          role: true,
          statusAktif: true,
          faceEmbedding: true,
          createdAt: true, // Need createdAt for response
        },
      });

      return {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        statusAktif: user.statusAktif,
        passwordSementara,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EMAIL_SUDAH_DIPAKAI',
          message: 'Email sudah digunakan oleh akun lain',
        });
      }
      throw error;
    }
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...updateEmployeeDto,
        },
        select: {
          id: true,
          nama: true,
          email: true,
          role: true,
          statusAktif: true,
          faceEmbedding: true,
        },
      });
      return this.mapToResponse(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            code: 'KARYAWAN_TIDAK_DITEMUKAN',
            message: 'Karyawan tidak ditemukan',
          });
        }
        if (error.code === 'P2002') {
          throw new ConflictException({
            code: 'EMAIL_SUDAH_DIPAKAI',
            message: 'Email sudah digunakan oleh akun lain',
          });
        }
      }
      throw error;
    }
  }

  async resetFaceRegistration(id: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { faceEmbedding: [] },
      });
      return { success: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          code: 'KARYAWAN_TIDAK_DITEMUKAN',
          message: 'Karyawan tidak ditemukan',
        });
      }
      throw error;
    }
  }

  private mapToResponse(user: EmployeeSelectData) {
    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      statusAktif: user.statusAktif,
      wajahTerdaftar:
        Array.isArray(user.faceEmbedding) && user.faceEmbedding.length > 0,
    };
  }

  private generateRandomPassword(length: number): string {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    const randomValues = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[randomValues[i] % chars.length];
    }
    return password;
  }
}
