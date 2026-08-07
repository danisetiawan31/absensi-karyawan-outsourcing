import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { GetAttendanceDashboardQueryDto } from './dto/get-attendance-dashboard-query.dto';
import { StatusIzin } from '@prisma/client';
import { getJakartaSingleDayRange } from '../../common/utils/date.util';
import { UNFILLED_SHIFT_THRESHOLD_MS } from '../../common/constants/attendance.constant';
import {
  determineShiftStatus,
  ShiftAttendanceStatus,
} from '../../common/utils/shift-status.util';

export type DashboardAttendanceStatus = ShiftAttendanceStatus;

export interface DashboardAttendanceItem {
  karyawan: string;
  site: string;
  status: DashboardAttendanceStatus;
  waktuCheckIn: Date | string | null;
}

export interface UnfilledShiftItem {
  jadwalId: string;
  karyawan: string;
  site: string;
  jamMulai: Date;
  jamSelesai: Date;
  menitTerlambat: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getAttendanceDashboard(
    supervisorId: string,
    query: GetAttendanceDashboardQueryDto,
  ): Promise<DashboardAttendanceItem[]> {
    const cacheKey = `dashboard:attendance:${supervisorId}:${query.tanggal}`;
    const cached =
      await this.cacheService.get<DashboardAttendanceItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Ambil daftar siteId yang diawasi oleh supervisor
    const supervisedSites = await this.prisma.supervisorSite.findMany({
      where: { supervisorId },
      select: { siteId: true },
    });

    if (supervisedSites.length === 0) {
      await this.cacheService.set(cacheKey, [], 30);
      return [];
    }

    const supervisedSiteIds = supervisedSites.map((s) => s.siteId);

    // 2. Hitung rentang waktu hari ini & H-1 (untuk overnight shift)
    const { gte: startOfToday, lt: endOfToday } = getJakartaSingleDayRange(
      query.tanggal,
    );
    const startOfYesterday = new Date(
      startOfToday.getTime() - 24 * 60 * 60 * 1000,
    );

    // 3. Query JadwalShift di site yang diawasi
    const jadwals = await this.prisma.jadwalShift.findMany({
      where: {
        siteId: { in: supervisedSiteIds },
        OR: [
          // Shift yang mulai pada tanggal yang di-query
          {
            tanggal: {
              gte: startOfToday,
              lt: endOfToday,
            },
          },
          // Shift malam H-1 yang jamSelesai-nya masuk ke tanggal yang di-query
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
        karyawanId: true,
        jamMulai: true,
        jamSelesai: true,
        karyawan: {
          select: {
            nama: true,
          },
        },
        site: {
          select: {
            nama: true,
          },
        },
        logKehadiran: {
          select: {
            waktuCheckIn: true,
            hasilVerifikasiCheckIn: true,
          },
        },
      },
      orderBy: { jamMulai: 'asc' },
    });

    if (jadwals.length === 0) {
      await this.cacheService.set(cacheKey, [], 30);
      return [];
    }

    // 4. Query pengajuan izin APPROVED untuk karyawan yang ada di jadwal
    const karyawanIds = Array.from(new Set(jadwals.map((j) => j.karyawanId)));
    const approvedLeaves = await this.prisma.pengajuanIzin.findMany({
      where: {
        karyawanId: { in: karyawanIds },
        status: StatusIzin.APPROVED,
        tanggalMulai: { lt: endOfToday },
        tanggalSelesai: { gte: startOfToday },
      },
      select: {
        karyawanId: true,
      },
    });

    const leaveKaryawanIds = new Set(approvedLeaves.map((l) => l.karyawanId));

    // 5. Tentukan status kehadiran berdasarkan urutan prioritas (Precedence)
    const result: DashboardAttendanceItem[] = jadwals.map((j) => {
      const hasApprovedLeave = leaveKaryawanIds.has(j.karyawanId);
      const status = determineShiftStatus(
        j.jamMulai,
        j.logKehadiran,
        hasApprovedLeave,
      );
      const waktuCheckIn = j.logKehadiran?.waktuCheckIn ?? null;

      return {
        karyawan: j.karyawan.nama,
        site: j.site.nama,
        status,
        waktuCheckIn,
      };
    });

    await this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  async getUnfilledShifts(
    supervisorId: string,
    query: GetAttendanceDashboardQueryDto,
    now: Date = new Date(),
  ): Promise<UnfilledShiftItem[]> {
    // 1. Ambil daftar siteId yang diawasi oleh supervisor
    const supervisedSites = await this.prisma.supervisorSite.findMany({
      where: { supervisorId },
      select: { siteId: true },
    });

    if (supervisedSites.length === 0) {
      return [];
    }

    const supervisedSiteIds = supervisedSites.map((s) => s.siteId);

    // 2. Hitung rentang waktu hari ini & H-1 (untuk overnight shift)
    const { gte: startOfToday, lt: endOfToday } = getJakartaSingleDayRange(
      query.tanggal,
    );
    const startOfYesterday = new Date(
      startOfToday.getTime() - 24 * 60 * 60 * 1000,
    );

    // 3. Query JadwalShift di site yang diawasi
    const jadwals = await this.prisma.jadwalShift.findMany({
      where: {
        siteId: { in: supervisedSiteIds },
        OR: [
          {
            tanggal: {
              gte: startOfToday,
              lt: endOfToday,
            },
          },
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
        karyawanId: true,
        jamMulai: true,
        jamSelesai: true,
        karyawan: {
          select: {
            nama: true,
          },
        },
        site: {
          select: {
            nama: true,
          },
        },
        logKehadiran: {
          select: {
            waktuCheckIn: true,
          },
        },
      },
      orderBy: { jamMulai: 'asc' },
    });

    if (jadwals.length === 0) {
      return [];
    }

    // 4. Query pengajuan izin APPROVED untuk karyawan yang ada di jadwal
    const karyawanIds = Array.from(new Set(jadwals.map((j) => j.karyawanId)));
    const approvedLeaves = await this.prisma.pengajuanIzin.findMany({
      where: {
        karyawanId: { in: karyawanIds },
        status: StatusIzin.APPROVED,
        tanggalMulai: { lt: endOfToday },
        tanggalSelesai: { gte: startOfToday },
      },
      select: {
        karyawanId: true,
      },
    });

    const leaveKaryawanIds = new Set(approvedLeaves.map((l) => l.karyawanId));

    // 5. Filter shift kosong real-time
    const nowTime = now.getTime();
    const result: UnfilledShiftItem[] = [];

    for (const j of jadwals) {
      const jamMulaiTime = j.jamMulai.getTime();
      const jamSelesaiTime = j.jamSelesai.getTime();

      const isPastThreshold =
        nowTime >= jamMulaiTime + UNFILLED_SHIFT_THRESHOLD_MS;
      const isNotEndedYet = nowTime < jamSelesaiTime;
      const isNotCheckedIn =
        !j.logKehadiran || j.logKehadiran.waktuCheckIn === null;
      const hasNoApprovedLeave = !leaveKaryawanIds.has(j.karyawanId);

      if (
        isPastThreshold &&
        isNotEndedYet &&
        isNotCheckedIn &&
        hasNoApprovedLeave
      ) {
        const menitTerlambat = Math.floor((nowTime - jamMulaiTime) / 60000);
        result.push({
          jadwalId: j.id,
          karyawan: j.karyawan.nama,
          site: j.site.nama,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          menitTerlambat,
        });
      }
    }

    return result;
  }

  async invalidateDashboardCache(
    siteId: string,
    tanggal: string,
  ): Promise<void> {
    try {
      const supervisors = await this.prisma.supervisorSite.findMany({
        where: { siteId },
        select: { supervisorId: true },
      });

      for (const s of supervisors) {
        await this.cacheService.del(
          `dashboard:attendance:${s.supervisorId}:${tanggal}`,
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to invalidate dashboard cache for site "${siteId}", date "${tanggal}": ${msg}`,
      );
    }
  }
}
