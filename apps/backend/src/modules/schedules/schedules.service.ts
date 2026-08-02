import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';
import {
  combineJakartaDateTime,
  formatJakartaDate,
  formatJakartaTime,
  getJakartaSingleDayRange,
  getJakartaStartOfDay,
  getJakartaTodayStr,
} from '../../common/utils/date.util';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseAndValidateDates(
    tanggal: string,
    jamMulai: string,
    jamSelesai: string,
  ) {
    const tanggalDate = getJakartaStartOfDay(tanggal);
    const jamMulaiDate = combineJakartaDateTime(tanggal, jamMulai);
    let jamSelesaiDate = combineJakartaDateTime(tanggal, jamSelesai);

    if (jamSelesaiDate < jamMulaiDate) {
      jamSelesaiDate = new Date(jamSelesaiDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const durasiShiftJam =
      (jamSelesaiDate.getTime() - jamMulaiDate.getTime()) / (1000 * 60 * 60);
    if (durasiShiftJam <= 0 || durasiShiftJam > 16) {
      throw new BadRequestException({
        code: 'DURASI_SHIFT_TIDAK_VALID',
        message:
          'Durasi shift tidak valid (harus lebih dari 0 dan maksimal 16 jam). Mohon periksa kembali jam mulai dan jam selesai Anda.',
      });
    }

    return { tanggalDate, jamMulaiDate, jamSelesaiDate };
  }

  private async checkOverlap(
    karyawanId: string,
    jamMulaiDate: Date,
    jamSelesaiDate: Date,
    excludeId?: string,
  ) {
    const where: Prisma.JadwalShiftWhereInput = {
      karyawanId,
      jamMulai: { lt: jamSelesaiDate },
      jamSelesai: { gt: jamMulaiDate },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const overlaps = await this.prisma.jadwalShift.findFirst({ where });

    if (overlaps) {
      throw new ConflictException({
        code: 'JADWAL_BENTROK',
        message:
          'Karyawan sudah punya jadwal lain yang bentrok di rentang waktu ini',
      });
    }
  }

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
    const { tanggalDate, jamMulaiDate, jamSelesaiDate } =
      this.parseAndValidateDates(tanggal, jamMulai, jamSelesai);

    // 5. Cek konflik (overlap waktu global per karyawan)
    await this.checkOverlap(karyawanId, jamMulaiDate, jamSelesaiDate);

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

  async remove(callerId: string, id: string) {
    // 1. Fetch data existing dulu
    const existing = await this.prisma.jadwalShift.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'JADWAL_TIDAK_DITEMUKAN',
        message: 'Jadwal shift tidak ditemukan',
      });
    }

    // 2. Scoping: Caller harus mengawasi site
    const assignment = await this.prisma.supervisorSite.findUnique({
      where: {
        supervisorId_siteId: {
          supervisorId: callerId,
          siteId: existing.siteId,
        },
      },
    });
    if (!assignment) {
      throw new ForbiddenException({
        code: 'SITE_DI_LUAR_PENGAWASAN',
        message: 'Anda tidak mengawasi site ini',
      });
    }

    // 3. Cek aktivitas
    const logKehadiran = await this.prisma.logKehadiran.findFirst({
      where: { jadwalId: id },
    });
    const percobaanAbsensi = await this.prisma.percobaanAbsensi.findFirst({
      where: { jadwalId: id },
    });

    if (logKehadiran || percobaanAbsensi) {
      throw new ConflictException({
        code: 'SUDAH_ADA_AKTIVITAS',
        message:
          'Jadwal ini sudah punya aktivitas kehadiran, tidak bisa dihapus. Gunakan PATCH untuk mengubah jam/site.',
      });
    }

    // 4. Lolos semua validasi, delete langsung
    await this.prisma.jadwalShift.delete({
      where: { id },
    });

    return { success: true };
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
    const { gte: awal, lt: akhir } = getJakartaSingleDayRange(tanggal);

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

  async update(
    callerId: string,
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    // 1. Fetch data existing dulu
    const existing = await this.prisma.jadwalShift.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'JADWAL_TIDAK_DITEMUKAN',
        message: 'Jadwal shift tidak ditemukan',
      });
    }

    // 2. Scoping: Caller harus mengawasi site LAMA
    const oldAssignment = await this.prisma.supervisorSite.findUnique({
      where: {
        supervisorId_siteId: {
          supervisorId: callerId,
          siteId: existing.siteId,
        },
      },
    });
    if (!oldAssignment) {
      throw new ForbiddenException({
        code: 'SITE_DI_LUAR_PENGAWASAN',
        message: 'Anda tidak mengawasi site lama dari jadwal ini',
      });
    }

    // 3. Scoping: Kalau siteId diganti (dan beda dari yang lama)
    const newSiteId = updateScheduleDto.siteId;
    if (newSiteId && newSiteId !== existing.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: newSiteId },
      });
      if (!site) {
        throw new NotFoundException({
          code: 'SITE_TIDAK_DITEMUKAN',
          message: 'Site tujuan tidak ditemukan',
        });
      }
      if (!site.statusAktif) {
        throw new BadRequestException({
          code: 'SITE_TIDAK_AKTIF',
          message:
            'Site tujuan sedang nonaktif, tidak bisa dijadikan tujuan jadwal',
        });
      }

      const newAssignment = await this.prisma.supervisorSite.findUnique({
        where: {
          supervisorId_siteId: {
            supervisorId: callerId,
            siteId: newSiteId,
          },
        },
      });
      if (!newAssignment) {
        throw new ForbiddenException({
          code: 'SITE_DI_LUAR_PENGAWASAN',
          message: 'Anda tidak mengawasi site tujuan baru ini',
        });
      }
    }
    // Jika tidak ganti siteId, SKIP pengecekan statusAktif (Pengecualian 3c)

    // 4. Validasi karyawanId jika diubah
    if (updateScheduleDto.karyawanId) {
      const karyawan = await this.prisma.user.findUnique({
        where: { id: updateScheduleDto.karyawanId },
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
    }

    // 5. Hitung nilai FINAL tiap field
    const finalKaryawanId = updateScheduleDto.karyawanId || existing.karyawanId;
    const finalSiteId = newSiteId || existing.siteId;

    // Untuk waktu, kita butuh format string HH:mm untuk diparsing lagi.
    // existing.tanggal adalah UTC yang ketika direpresentasikan sebagai yyyy-mm-dd butuh di format yang benar.
    const finalTanggalStr =
      updateScheduleDto.tanggal || formatJakartaDate(existing.tanggal);
    const finalJamMulaiStr =
      updateScheduleDto.jamMulai || formatJakartaTime(existing.jamMulai);
    const finalJamSelesaiStr =
      updateScheduleDto.jamSelesai || formatJakartaTime(existing.jamSelesai);

    const { tanggalDate, jamMulaiDate, jamSelesaiDate } =
      this.parseAndValidateDates(
        finalTanggalStr,
        finalJamMulaiStr,
        finalJamSelesaiStr,
      );

    // 6. Overlap check (exclude current id)
    await this.checkOverlap(finalKaryawanId, jamMulaiDate, jamSelesaiDate, id);

    // 7. Update record
    const updated = await this.prisma.jadwalShift.update({
      where: { id },
      data: {
        karyawanId: finalKaryawanId,
        siteId: finalSiteId,
        tanggal: tanggalDate,
        jamMulai: jamMulaiDate,
        jamSelesai: jamSelesaiDate,
      },
      select: {
        id: true,
        tanggal: true,
        jamMulai: true,
        jamSelesai: true,
        karyawan: {
          select: { id: true, nama: true },
        },
        site: {
          select: { id: true, nama: true },
        },
      },
    });

    return updated;
  }

  async findToday(karyawanId: string) {
    const todayStr = getJakartaTodayStr();
    const { gte: startOfToday, lt: endOfToday } =
      getJakartaSingleDayRange(todayStr);
    const startOfYesterday = new Date(
      startOfToday.getTime() - 24 * 60 * 60 * 1000,
    );

    const jadwals = await this.prisma.jadwalShift.findMany({
      where: {
        karyawanId,
        OR: [
          // 1. Shift yang dimulai hari ini
          {
            tanggal: {
              gte: startOfToday,
              lt: endOfToday,
            },
          },
          // 2. Shift malam H-1 yang berakhir HARI INI
          {
            tanggal: {
              gte: startOfYesterday,
              lt: startOfToday,
            },
            jamSelesai: {
              gt: startOfToday,
            },
          },
        ],
      },
      select: {
        id: true,
        jamMulai: true,
        jamSelesai: true,
        site: {
          select: {
            nama: true,
            alamat: true,
            latitude: true,
            longitude: true,
            radiusToleransi: true,
          },
        },
        logKehadiran: {
          select: {
            waktuCheckIn: true,
            waktuCheckOut: true,
          },
        },
      },
      orderBy: { jamMulai: 'asc' },
    });

    return jadwals.map((j) => {
      let statusKehadiran = 'BELUM_CHECKIN';

      if (j.logKehadiran) {
        if (j.logKehadiran.waktuCheckIn) {
          if (j.logKehadiran.waktuCheckOut) {
            statusKehadiran = 'SELESAI';
          } else {
            statusKehadiran = 'SUDAH_CHECKIN';
          }
        }
      }

      return {
        jadwalId: j.id,
        site: j.site,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai,
        statusKehadiran,
        waktuCheckIn: j.logKehadiran?.waktuCheckIn ?? null,
        waktuCheckOut: j.logKehadiran?.waktuCheckOut ?? null,
      };
    });
  }
}
