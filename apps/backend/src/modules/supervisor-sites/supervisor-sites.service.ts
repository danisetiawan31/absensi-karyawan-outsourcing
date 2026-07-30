import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSupervisorSiteDto } from './dto/create-supervisor-site.dto';
import { FindSupervisorSitesQueryDto } from './dto/find-supervisor-sites-query.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class SupervisorSitesService {
  constructor(private prisma: PrismaService) {}

  async create(createSupervisorSiteDto: CreateSupervisorSiteDto) {
    const { supervisorId, siteId } = createSupervisorSiteDto;

    // 1. Validasi supervisorId
    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId },
    });

    if (!supervisor) {
      throw new NotFoundException({
        code: 'SUPERVISOR_TIDAK_DITEMUKAN',
        message: 'Supervisor tidak ditemukan',
      });
    }

    if (supervisor.role !== Role.SUPERVISOR) {
      throw new BadRequestException({
        code: 'ROLE_BUKAN_SUPERVISOR',
        message: 'User yang ditunjuk bukan supervisor',
      });
    }

    // 2. Validasi siteId
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException({
        code: 'SITE_TIDAK_DITEMUKAN',
        message: 'Site tidak ditemukan',
      });
    }

    // 3. Create
    try {
      const supervisorSite = await this.prisma.supervisorSite.create({
        data: {
          supervisorId,
          siteId,
        },
        select: {
          id: true,
        },
      });

      return supervisorSite;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'ASSIGNMENT_SUDAH_ADA',
          message: 'Supervisor ini sudah ditugaskan ke site tersebut',
        });
      }
      throw error;
    }
  }

  async findAll(
    callerId: string,
    callerRole: Role,
    query: FindSupervisorSitesQueryDto,
  ) {
    const where: Prisma.SupervisorSiteWhereInput = {};

    if (callerRole === Role.SUPERVISOR) {
      where.supervisorId = callerId;
    } else if (callerRole === Role.HR_ADMIN) {
      if (query.supervisorId) {
        where.supervisorId = query.supervisorId;
      }
    }

    const assignments = await this.prisma.supervisorSite.findMany({
      where,
      select: {
        id: true,
        site: {
          select: {
            id: true,
            nama: true,
            alamat: true,
          },
        },
      },
    });

    return assignments;
  }

  async remove(id: string) {
    try {
      await this.prisma.supervisorSite.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            code: 'ASSIGNMENT_TIDAK_DITEMUKAN',
            message: 'Assignment tidak ditemukan',
          });
        }
      }
      throw error;
    }
  }
}
