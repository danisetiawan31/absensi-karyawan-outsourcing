import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(callerId: string, createScheduleDto: CreateScheduleDto) {
    const { karyawanId, siteId, tanggal, jamMulai, jamSelesai } =
      createScheduleDto;

    // 1. Cek karyawan
    const karyawan = await this.prisma.user.findUnique({
      where: { id: karyawanId },
    });
    if (!karyawan) {
      throw new NotFoundException({
        code: 'KARYAWAN_TIDAK_DITEMUKAN',
        message: 'Karyawan tidak ditemukan',
      });
    }
    if (karyawan.role !== Role.KARYAWAN) {
      throw new BadRequestException({
        code: 'ROLE_BUKAN_KARYAWAN',
        message: 'User bukan karyawan',
      });
    }

    // 2. Cek site
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });
    if (!site) {
      throw new NotFoundException({
        code: 'SITE_TIDAK_DITEMUKAN',
        message: 'Site tidak ditemukan',
      });
    }
    if (!site.statusAktif) {
      throw new BadRequestException({
        code: 'SITE_TIDAK_AKTIF',
        message:
          'Site sedang nonaktif, tidak bisa dijadikan tujuan jadwal baru',
      });
    }

    // 3. Cek scoping SupervisorSite
    const assignment = await this.prisma.supervisorSite.findUnique({
      where: {
        supervisorId_siteId: {
          supervisorId: callerId,
          siteId,
        },
      },
    });
    if (!assignment) {
      throw new ForbiddenException({
        code: 'SITE_DI_LUAR_PENGAWASAN',
        message: 'Anda tidak mengawasi site ini',
      });
    }

    // 4. Konversi tanggal dan jam (WIB / UTC+7)
    const tanggalDate = new Date(`${tanggal}T00:00:00+07:00`);
    const jamMulaiDate = new Date(`${tanggal}T${jamMulai}:00+07:00`);
    let jamSelesaiDate = new Date(`${tanggal}T${jamSelesai}:00+07:00`);

    // Kalau shift lintas hari (misal jam mulai 20:00, selesai 04:00)
    if (jamSelesaiDate < jamMulaiDate) {
      jamSelesaiDate = new Date(jamSelesaiDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // 4.5 Sanity check durasi shift maksimum (misal 16 jam)
    const durasiShiftJam =
      (jamSelesaiDate.getTime() - jamMulaiDate.getTime()) / (1000 * 60 * 60);
    if (durasiShiftJam > 16) {
      throw new BadRequestException({
        code: 'DURASI_SHIFT_TIDAK_VALID',
        message:
          'Durasi shift melebihi batas wajar (maksimal 16 jam). Mohon periksa kembali jam mulai dan jam selesai Anda.',
      });
    }

    // 5. Cek konflik (overlap waktu global per karyawan)
    const overlaps = await this.prisma.jadwalShift.findFirst({
      where: {
        karyawanId,
        jamMulai: { lt: jamSelesaiDate },
        jamSelesai: { gt: jamMulaiDate },
      },
    });

    if (overlaps) {
      throw new ConflictException({
        code: 'JADWAL_BENTROK',
        message:
          'Karyawan sudah punya jadwal lain yang bentrok di rentang waktu ini',
      });
    }

    // 6. Buat jadwal
    const newJadwal = await this.prisma.jadwalShift.create({
      data: {
        karyawanId,
        siteId,
        tanggal: tanggalDate,
        jamMulai: jamMulaiDate,
        jamSelesai: jamSelesaiDate,
      },
      select: {
        id: true,
        karyawanId: true,
        siteId: true,
        tanggal: true,
        jamMulai: true,
        jamSelesai: true,
      },
    });

    return newJadwal;
  }

  async findAll(callerId: string, query: FindSchedulesQueryDto) {
    const { tanggal, siteId } = query;

    // 1. Ambil semua site yang diawasi caller
    const supervisedSites = await this.prisma.supervisorSite.findMany({
      where: { supervisorId: callerId },
      select: { siteId: true },
    });

    if (supervisedSites.length === 0) {
      return [];
    }

    const supervisedSiteIds = supervisedSites.map((s) => s.siteId);

    // 2. Rentang waktu tanggal
    const awal = new Date(`${tanggal}T00:00:00+07:00`);
    const akhir = new Date(awal.getTime() + 24 * 60 * 60 * 1000);

    // 3. Bangun where filter
    const whereClause: Prisma.JadwalShiftWhereInput = {
      siteId: { in: supervisedSiteIds },
      tanggal: {
        gte: awal,
        lt: akhir,
      },
    };

    if (siteId) {
      whereClause.AND = { siteId };
    }

    // 4. Eksekusi query
    const schedules = await this.prisma.jadwalShift.findMany({
      where: whereClause,
      select: {
        id: true,
        tanggal: true,
        jamMulai: true,
        jamSelesai: true,
        karyawan: {
          select: {
            id: true,
            nama: true,
          },
        },
        site: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
      orderBy: {
        jamMulai: 'asc',
      },
    });

    return schedules;
  }
}
