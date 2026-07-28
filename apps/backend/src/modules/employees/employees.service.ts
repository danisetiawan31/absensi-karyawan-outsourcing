import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FindEmployeesQueryDto } from './dto/find-employees-query.dto';
import { Prisma, Role } from '@prisma/client';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

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
            code: 'NOT_FOUND',
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
}
