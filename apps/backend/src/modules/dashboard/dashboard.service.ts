import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetAttendanceDashboardQueryDto } from './dto/get-attendance-dashboard-query.dto';
import { HasilVerifikasi, StatusIzin } from '@prisma/client';
import { getJakartaSingleDayRange } from '../../common/utils/date.util';
import { UNFILLED_SHIFT_THRESHOLD_MS } from '../../common/constants/attendance.constant';

export type DashboardAttendanceStatus =
  'HADIR' | 'BELUM' | 'TERLAMBAT' | 'IZIN' | 'TIDAK_HADIR';

export interface DashboardAttendanceItem {
  karyawan: string;
  site: string;
  status: DashboardAttendanceStatus;
  waktuCheckIn: Date | null;
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
  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceDashboard(
    supervisorId: string,
    query: GetAttendanceDashboardQueryDto,
  ): Promise<DashboardAttendanceItem[]> {
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
    return jadwals.map((j) => {
      let status: DashboardAttendanceStatus = 'BELUM';
      let waktuCheckIn: Date | null = null;

      if (
        j.logKehadiran?.hasilVerifikasiCheckIn === HasilVerifikasi.TIDAK_HADIR
      ) {
        status = 'TIDAK_HADIR';
      } else if (j.logKehadiran?.waktuCheckIn) {
        waktuCheckIn = j.logKehadiran.waktuCheckIn;
        if (waktuCheckIn.getTime() > j.jamMulai.getTime()) {
          status = 'TERLAMBAT';
        } else {
          status = 'HADIR';
        }
      } else if (leaveKaryawanIds.has(j.karyawanId)) {
        status = 'IZIN';
      } else {
        status = 'BELUM';
      }

      return {
        karyawan: j.karyawan.nama,
        site: j.site.nama,
        status,
        waktuCheckIn,
      };
    });
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
}
