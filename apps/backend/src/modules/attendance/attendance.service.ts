import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FaceVerificationService } from '../face-verification/face-verification.service';
import { haversineDistance } from '../../common/utils/geo.util';
import { cosineSimilarity } from '../../common/utils/vector.util';
import {
  TipeAbsensi,
  HasilVerifikasi,
  StatusIzin,
  Prisma,
} from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { GetAttendanceSummaryQueryDto } from './dto/get-attendance-summary-query.dto';
import { GetAttendanceAttemptsQueryDto } from './dto/get-attendance-attempts-query.dto';
import { getJakartaDateRange } from '../../common/utils/date.util';
import { determineShiftStatus } from '../../common/utils/shift-status.util';

export interface AttendanceSummaryItem {
  karyawanId: string;
  nama: string;
  totalJadwal: number;
  totalHadir: number;
  totalTerlambat: number;
  totalTidakHadir: number;
  totalIzin: number;
  totalBelum: number;
}

export interface AttendanceAttemptItem {
  id: string;
  tipe: TipeAbsensi;
  waktu: Date;
  latitude: number;
  longitude: number;
  hasil: HasilVerifikasi;
  jadwalId: string;
}

export interface VerificationPipelineResult {
  hasilVerifikasi: HasilVerifikasi;
  pesan: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly faceVerificationService: FaceVerificationService,
  ) {}

  // Part A: Verification Pipeline (Shared for Check-In and Check-Out)
  async runVerificationPipeline(
    userFaceEmbedding: number[],
    base64Foto: string,
    requestLat: number,
    requestLon: number,
    siteLat: number,
    siteLon: number,
    radiusToleransi: number,
  ): Promise<VerificationPipelineResult> {
    // 2. Haversine check
    const distance = haversineDistance(
      requestLat,
      requestLon,
      siteLat,
      siteLon,
    );
    if (distance > radiusToleransi) {
      return {
        hasilVerifikasi: HasilVerifikasi.GAGAL_LOKASI,
        pesan: 'Anda berada di luar radius lokasi',
      };
    }

    // 3. Panggil face-service
    let faceResult: import('../face-verification/face-verification.service').EmbedFaceResponse;
    try {
      faceResult = await this.faceVerificationService.embedFace(base64Foto);
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        const response = e.getResponse() as Record<string, unknown>;
        if (
          response &&
          typeof response === 'object' &&
          response.code === 'WAJAH_TIDAK_TERDETEKSI'
        ) {
          return {
            hasilVerifikasi: HasilVerifikasi.GAGAL_WAJAH,
            pesan: 'Wajah tidak terdeteksi dalam foto',
          };
        }
      }
      throw e;
    }

    // 4. Liveness check
    if (!faceResult.liveness.isLive) {
      return {
        hasilVerifikasi: HasilVerifikasi.GAGAL_LIVENESS,
        pesan: 'Foto tidak terdeteksi sebagai wajah asli (liveness gagal)',
      };
    }

    // 5. Face match check
    const thresholdStr = process.env.FACE_MATCH_DISTANCE_THRESHOLD || '0.40';
    const threshold = parseFloat(thresholdStr);
    const similarity = cosineSimilarity(
      faceResult.embedding,
      userFaceEmbedding,
    );
    const distanceScore = 1 - similarity;

    if (distanceScore > threshold) {
      return {
        hasilVerifikasi: HasilVerifikasi.GAGAL_WAJAH,
        pesan: 'Wajah tidak cocok dengan data pendaftaran',
      };
    }

    // All passed
    return {
      hasilVerifikasi: HasilVerifikasi.VALID,
      pesan: 'Verifikasi berhasil',
    };
  }

  // Part B: Check-in logic
  async checkIn(userId: string, dto: CheckInDto, file: Express.Multer.File) {
    // 0. Ambil JadwalShift
    const jadwal = await this.prisma.jadwalShift.findUnique({
      where: { id: dto.jadwalId },
      include: { site: true },
    });

    if (!jadwal || jadwal.karyawanId !== userId) {
      throw new HttpException(
        {
          code: 'JADWAL_TIDAK_DITEMUKAN',
          message: 'Jadwal shift tidak ditemukan atau bukan milik Anda',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // 0b. Cek LogKehadiran existing
    const existingLog = await this.prisma.logKehadiran.findUnique({
      where: { jadwalId: dto.jadwalId },
    });

    if (existingLog && existingLog.waktuCheckIn) {
      throw new HttpException(
        {
          code: 'SUDAH_CHECKIN',
          message: 'Anda sudah melakukan check-in untuk jadwal ini',
        },
        HttpStatus.CONFLICT,
      );
    }

    // 0c. Ambil User faceEmbedding
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { faceEmbedding: true },
    });

    if (!user || !user.faceEmbedding || user.faceEmbedding.length === 0) {
      throw new HttpException(
        {
          code: 'WAJAH_BELUM_TERDAFTAR',
          message:
            'Wajah belum terdaftar. Silakan registrasi wajah terlebih dahulu.',
        },
        // Ditolak di awal tanpa mencatat ke PercobaanAbsensi karena prasyarat (wajah) belum terpenuhi.
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();

    // 1. Window check (now harus antara jamMulai - 30 menit sampai jamSelesai)
    const windowStart = new Date(jadwal.jamMulai.getTime() - 30 * 60000);
    const windowEnd = jadwal.jamSelesai;

    if (now < windowStart || now > windowEnd) {
      await this.prisma.percobaanAbsensi.create({
        data: {
          jadwalId: dto.jadwalId,
          karyawanId: userId,
          tipe: TipeAbsensi.CHECK_IN,
          waktu: now,
          latitude: dto.latitude,
          longitude: dto.longitude,
          hasil: HasilVerifikasi.DI_LUAR_JENDELA_WAKTU,
        },
      });
      return {
        hasilVerifikasi: HasilVerifikasi.DI_LUAR_JENDELA_WAKTU,
        pesan: 'Waktu check-in di luar batas yang diizinkan',
      };
    }

    const base64Foto = file.buffer.toString('base64');

    const verification = await this.runVerificationPipeline(
      user.faceEmbedding,
      base64Foto,
      dto.latitude,
      dto.longitude,
      jadwal.site.latitude,
      jadwal.site.longitude,
      jadwal.site.radiusToleransi,
    );

    if (verification.hasilVerifikasi !== HasilVerifikasi.VALID) {
      await this.prisma.percobaanAbsensi.create({
        data: {
          jadwalId: dto.jadwalId,
          karyawanId: userId,
          tipe: TipeAbsensi.CHECK_IN,
          waktu: now,
          latitude: dto.latitude,
          longitude: dto.longitude,
          hasil: verification.hasilVerifikasi,
        },
      });
      return verification;
    }

    // 6. Transaction (All passed)
    try {
      const [logKehadiran] = await this.prisma.$transaction([
        this.prisma.logKehadiran.create({
          data: {
            jadwalId: dto.jadwalId,
            karyawanId: userId,
            waktuCheckIn: now,
            latitudeCheckIn: dto.latitude,
            longitudeCheckIn: dto.longitude,
            hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
          },
        }),
        this.prisma.percobaanAbsensi.create({
          data: {
            jadwalId: dto.jadwalId,
            karyawanId: userId,
            tipe: TipeAbsensi.CHECK_IN,
            waktu: now,
            latitude: dto.latitude,
            longitude: dto.longitude,
            hasil: HasilVerifikasi.VALID,
          },
        }),
      ]);

      return {
        logId: logKehadiran.id,
        waktuCheckIn: logKehadiran.waktuCheckIn,
        hasilVerifikasi: HasilVerifikasi.VALID,
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new HttpException(
          {
            code: 'SUDAH_CHECKIN',
            message: 'Anda sudah melakukan check-in untuk jadwal ini',
          },
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }

  // Part C: Check-out logic
  async checkOut(userId: string, dto: CheckOutDto, file: Express.Multer.File) {
    // 0. Ambil JadwalShift
    const jadwal = await this.prisma.jadwalShift.findUnique({
      where: { id: dto.jadwalId },
      include: { site: true },
    });

    if (!jadwal || jadwal.karyawanId !== userId) {
      throw new HttpException(
        {
          code: 'JADWAL_TIDAK_DITEMUKAN',
          message: 'Jadwal shift tidak ditemukan atau bukan milik Anda',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // 0b. Ambil LogKehadiran existing
    const existingLog = await this.prisma.logKehadiran.findUnique({
      where: { jadwalId: dto.jadwalId },
    });

    if (!existingLog || !existingLog.waktuCheckIn) {
      throw new HttpException(
        {
          code: 'BELUM_CHECKIN',
          message: 'Anda belum melakukan check-in untuk jadwal ini',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingLog.waktuCheckOut) {
      throw new HttpException(
        {
          code: 'SUDAH_CHECKOUT',
          message: 'Anda sudah melakukan check-out untuk jadwal ini',
        },
        HttpStatus.CONFLICT,
      );
    }

    // 0c. Ambil User faceEmbedding
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { faceEmbedding: true },
    });

    if (!user || !user.faceEmbedding || user.faceEmbedding.length === 0) {
      throw new HttpException(
        {
          code: 'WAJAH_BELUM_TERDAFTAR',
          message:
            'Wajah belum terdaftar. Silakan registrasi wajah terlebih dahulu.',
        },
        // Ditolak di awal tanpa mencatat ke PercobaanAbsensi karena prasyarat (wajah) belum terpenuhi.
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();

    // 1. Window check (now harus antara logKehadiran.waktuCheckIn sampai jamSelesai + 4 jam)
    const windowStart = existingLog.waktuCheckIn;
    const windowEnd = new Date(
      jadwal.jamSelesai.getTime() + 4 * 60 * 60 * 1000,
    );

    if (now < windowStart || now > windowEnd) {
      await this.prisma.percobaanAbsensi.create({
        data: {
          jadwalId: dto.jadwalId,
          karyawanId: userId,
          tipe: TipeAbsensi.CHECK_OUT,
          waktu: now,
          latitude: dto.latitude,
          longitude: dto.longitude,
          hasil: HasilVerifikasi.DI_LUAR_JENDELA_WAKTU,
        },
      });
      return {
        hasilVerifikasi: HasilVerifikasi.DI_LUAR_JENDELA_WAKTU,
        pesan:
          'Waktu check-out di luar batas yang diizinkan, hubungi supervisor untuk koreksi manual',
      };
    }

    const base64Foto = file.buffer.toString('base64');

    // 2-5. Panggil runVerificationPipeline
    const verification = await this.runVerificationPipeline(
      user.faceEmbedding,
      base64Foto,
      dto.latitude,
      dto.longitude,
      jadwal.site.latitude,
      jadwal.site.longitude,
      jadwal.site.radiusToleransi,
    );

    if (verification.hasilVerifikasi !== HasilVerifikasi.VALID) {
      await this.prisma.percobaanAbsensi.create({
        data: {
          jadwalId: dto.jadwalId,
          karyawanId: userId,
          tipe: TipeAbsensi.CHECK_OUT,
          waktu: now,
          latitude: dto.latitude,
          longitude: dto.longitude,
          hasil: verification.hasilVerifikasi,
        },
      });
      return verification;
    }

    // 6. Transaction (All passed) - update existing log
    const [updateResult] = await this.prisma.$transaction([
      this.prisma.logKehadiran.updateMany({
        where: { jadwalId: dto.jadwalId, waktuCheckOut: null },
        data: {
          waktuCheckOut: now,
          latitudeCheckOut: dto.latitude,
          longitudeCheckOut: dto.longitude,
          hasilVerifikasiCheckOut: HasilVerifikasi.VALID,
        },
      }),
      this.prisma.percobaanAbsensi.create({
        data: {
          jadwalId: dto.jadwalId,
          karyawanId: userId,
          tipe: TipeAbsensi.CHECK_OUT,
          waktu: now,
          latitude: dto.latitude,
          longitude: dto.longitude,
          hasil: HasilVerifikasi.VALID,
        },
      }),
    ]);

    if (updateResult.count === 0) {
      throw new HttpException(
        {
          code: 'SUDAH_CHECKOUT',
          message: 'Anda sudah melakukan check-out untuk jadwal ini',
        },
        HttpStatus.CONFLICT,
      );
    }

    return {
      logId: existingLog.id,
      waktuCheckOut: now,
      hasilVerifikasi: HasilVerifikasi.VALID,
    };
  }

  async getAttendanceSummary(
    query: GetAttendanceSummaryQueryDto,
  ): Promise<AttendanceSummaryItem[]> {
    const { gte: startOfPeriode, lt: endOfPeriode } = getJakartaDateRange(
      query.periodeMulai,
      query.periodeSelesai,
    );

    // 1. Query semua JadwalShift dalam rentang periode
    const jadwals = await this.prisma.jadwalShift.findMany({
      where: {
        tanggal: {
          gte: startOfPeriode,
          lt: endOfPeriode,
        },
      },
      select: {
        id: true,
        karyawanId: true,
        jamMulai: true,
        karyawan: {
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
    });

    if (jadwals.length === 0) {
      return [];
    }

    // 2. Query PengajuanIzin APPROVED yang overlap periode ini
    const karyawanIds = Array.from(new Set(jadwals.map((j) => j.karyawanId)));
    const approvedLeaves = await this.prisma.pengajuanIzin.findMany({
      where: {
        karyawanId: { in: karyawanIds },
        status: StatusIzin.APPROVED,
        tanggalMulai: { lt: endOfPeriode },
        tanggalSelesai: { gte: startOfPeriode },
      },
      select: {
        karyawanId: true,
      },
    });

    const leaveKaryawanIds = new Set(approvedLeaves.map((l) => l.karyawanId));

    // 3. Agregasi per karyawan
    const summaryMap = new Map<string, AttendanceSummaryItem>();

    for (const j of jadwals) {
      let item = summaryMap.get(j.karyawanId);
      if (!item) {
        item = {
          karyawanId: j.karyawanId,
          nama: j.karyawan.nama,
          totalJadwal: 0,
          totalHadir: 0,
          totalTerlambat: 0,
          totalTidakHadir: 0,
          totalIzin: 0,
          totalBelum: 0,
        };
        summaryMap.set(j.karyawanId, item);
      }

      item.totalJadwal += 1;
      const hasApprovedLeave = leaveKaryawanIds.has(j.karyawanId);
      const status = determineShiftStatus(
        j.jamMulai,
        j.logKehadiran,
        hasApprovedLeave,
      );

      switch (status) {
        case 'HADIR':
          item.totalHadir += 1;
          break;
        case 'TERLAMBAT':
          item.totalTerlambat += 1;
          break;
        case 'TIDAK_HADIR':
          item.totalTidakHadir += 1;
          break;
        case 'IZIN':
          item.totalIzin += 1;
          break;
        case 'BELUM':
          item.totalBelum += 1;
          break;
      }
    }

    // 4. Urutkan per nama karyawan ascending
    const result = Array.from(summaryMap.values());
    result.sort((a, b) => a.nama.localeCompare(b.nama));

    return result;
  }

  async getAttendanceAttempts(
    query: GetAttendanceAttemptsQueryDto,
  ): Promise<AttendanceAttemptItem[]> {
    const { gte: startOfPeriode, lt: endOfPeriode } = getJakartaDateRange(
      query.periodeMulai,
      query.periodeSelesai,
    );

    const attempts = await this.prisma.percobaanAbsensi.findMany({
      where: {
        karyawanId: query.karyawanId,
        waktu: {
          gte: startOfPeriode,
          lt: endOfPeriode,
        },
      },
      select: {
        id: true,
        tipe: true,
        waktu: true,
        latitude: true,
        longitude: true,
        hasil: true,
        jadwalId: true,
      },
      orderBy: {
        waktu: 'asc',
      },
    });

    return attempts;
  }
}
