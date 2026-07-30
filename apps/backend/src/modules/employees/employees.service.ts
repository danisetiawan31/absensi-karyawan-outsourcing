import {
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

    const startOfDay = new Date(`${tanggal}T00:00:00+07:00`);
    const endOfDay = new Date(`${tanggal}T23:59:59+07:00`);

    const users = await this.prisma.user.findMany({
      where: {
        role: Role.KARYAWAN,
        statusAktif: true,
        jadwalShift: {
          none: {
            tanggal: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
        pengajuanIzin: {
          none: {
            status: StatusIzin.APPROVED,
            tanggalMulai: { lte: endOfDay },
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
