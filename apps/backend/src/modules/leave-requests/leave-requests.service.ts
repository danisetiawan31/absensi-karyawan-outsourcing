import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import { FindLeaveRequestsHistoryQueryDto } from './dto/find-leave-requests-history-query.dto';
import { Prisma, Role, TipeNotifikasi } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import 'multer';
import {
  formatJakartaDate,
  getJakartaDateRange,
  getJakartaSingleDayRange,
  getJakartaStartOfDay,
} from '../../common/utils/date.util';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class LeaveRequestsService {
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
  ) {}

  async create(
    userId: string,
    dto: CreateLeaveRequestDto,
    file?: Express.Multer.File,
  ) {
    const mulai = getJakartaStartOfDay(dto.tanggalMulai);
    const selesai = getJakartaStartOfDay(dto.tanggalSelesai);

    if (selesai.getTime() < mulai.getTime()) {
      throw new BadRequestException({
        code: 'RENTANG_TANGGAL_TIDAK_VALID',
        message: 'Tanggal selesai tidak boleh mendahului tanggal mulai',
      });
    }

    if (dto.jenis === 'SAKIT' && selesai.getTime() > mulai.getTime() && !file) {
      throw new BadRequestException({
        code: 'DOKUMEN_WAJIB',
        message:
          'Surat keterangan dokter wajib dilampirkan untuk sakit lebih dari 1 hari',
      });
    }

    const overlap = await this.prisma.pengajuanIzin.findFirst({
      where: {
        karyawanId: userId,
        status: { in: ['PENDING', 'APPROVED'] },
        tanggalMulai: { lte: selesai },
        tanggalSelesai: { gte: mulai },
      },
    });

    if (overlap) {
      throw new ConflictException({
        code: 'IZIN_BENTROK',
        message:
          'Anda sudah punya pengajuan izin lain yang tumpang tindih di rentang tanggal ini',
      });
    }

    let dokumenPendukungUrl: string | undefined;

    if (file) {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException({
          code: 'FORMAT_DOKUMEN_TIDAK_VALID',
          message: 'Format dokumen harus PDF, JPEG, atau PNG',
        });
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException({
          code: 'DOKUMEN_TERLALU_BESAR',
          message: 'Ukuran dokumen tidak boleh melebihi 5MB',
        });
      }

      const ext = path.extname(file.originalname);
      const filename = `${crypto.randomUUID()}${ext}`;
      const uploadDir = path.join(process.cwd(), 'storage', 'dokumen-izin');

      await fs.promises.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, file.buffer);

      dokumenPendukungUrl = `storage/dokumen-izin/${filename}`;
    }

    const created = await this.prisma.pengajuanIzin.create({
      data: {
        karyawanId: userId,
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        jenis: dto.jenis,
        alasan: dto.alasan,
        dokumenPendukungUrl,
        status: 'PENDING',
      },
    });

    // Deteksi & notifikasi orphaned secara async — TIDAK menggagalkan response sukses
    try {
      await this.notifyOrphanedLeaveRequest(userId, mulai, selesai);
    } catch (err: unknown) {
      this.logger.error(
        'Gagal membuat notifikasi orphaned leave request',
        err instanceof Error ? err.stack : String(err),
      );
    }

    return {
      id: created.id,
      status: created.status,
    };
  }

  /**
   * Cek apakah karyawan ini tidak punya JadwalShift APAPUN yang overlap
   * dengan rentang izin — bila orphaned, broadcast notifikasi ke semua HR_ADMIN aktif.
   */
  private async notifyOrphanedLeaveRequest(
    karyawanId: string,
    mulai: Date,
    selesai: Date,
  ): Promise<void> {
    const orphaned = await this.isOrphaned(karyawanId, mulai, selesai);

    if (!orphaned) {
      // Ada jadwal yang overlap (atau tidak orphaned) — skip
      return;
    }

    // Ambil semua HR_ADMIN yang aktif
    const hrAdmins = await this.prisma.user.findMany({
      where: { role: Role.HR_ADMIN, statusAktif: true },
      select: { id: true },
    });

    if (hrAdmins.length === 0) {
      // Tidak ada HR_ADMIN aktif — skip diam-diam
      return;
    }

    // Ambil nama karyawan untuk pesan notifikasi
    const karyawan = await this.prisma.user.findUnique({
      where: { id: karyawanId },
      select: { nama: true },
    });

    const namaKaryawan = karyawan?.nama ?? karyawanId;
    const tanggalMulaiFormatted = formatJakartaDate(mulai);
    const tanggalSelesaiFormatted = formatJakartaDate(selesai);
    const pesan =
      `Pengajuan izin ${namaKaryawan} ` +
      `(${tanggalMulaiFormatted} s/d ${tanggalSelesaiFormatted}) ` +
      `tidak terhubung ke jadwal manapun — perlu review manual.`;

    await this.prisma.notifikasi.createMany({
      data: hrAdmins.map((hr) => ({
        userId: hr.id,
        jadwalId: null,
        tipe: TipeNotifikasi.PENGAJUAN_IZIN_ORPHANED,
        pesan,
        dibaca: false,
      })),
      skipDuplicates: true,
    });
  }

  async findAll(userId: string) {
    return this.prisma.pengajuanIzin.findMany({
      where: { karyawanId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        jenis: true,
        alasan: true,
        dokumenPendukungUrl: true,
        status: true,
        catatanSupervisor: true,
        createdAt: true,
        approvedBy: {
          select: {
            nama: true,
          },
        },
      },
    });
  }

  async findPendingForSupervisor(supervisorId: string) {
    // 1. Ambil daftar siteId yang diawasi supervisor ini
    const supervisedSites = await this.prisma.supervisorSite.findMany({
      where: { supervisorId },
      select: { siteId: true },
    });

    if (supervisedSites.length === 0) {
      return [];
    }

    const siteIds = supervisedSites.map((s) => s.siteId);

    // 2. Ambil semua JadwalShift di site-site tsb (scoping kasar)
    const jadwalShifts = await this.prisma.jadwalShift.findMany({
      where: { siteId: { in: siteIds } },
      select: {
        siteId: true,
        karyawanId: true,
        jamMulai: true,
        jamSelesai: true,
      },
    });

    if (jadwalShifts.length === 0) {
      return [];
    }

    const karyawanIdsWithSchedules = [
      ...new Set(jadwalShifts.map((j) => j.karyawanId)),
    ];

    // 3. Ambil PengajuanIzin dengan status=PENDING
    const candidates = await this.prisma.pengajuanIzin.findMany({
      where: {
        status: 'PENDING',
        karyawanId: { in: karyawanIdsWithSchedules },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        karyawanId: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        jenis: true,
        alasan: true,
        dokumenPendukungUrl: true,
        status: true,
        catatanSupervisor: true,
        createdAt: true,
        karyawan: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    // 4. Filter kandidat di application code
    const validRequests = candidates.filter((izin) => {
      return jadwalShifts.some((j) => {
        if (j.karyawanId !== izin.karyawanId) return false;

        return this.checkOverlap(
          j.jamMulai,
          j.jamSelesai,
          izin.tanggalMulai,
          izin.tanggalSelesai,
        );
      });
    });

    return validRequests;
  }

  private checkOverlap(
    shiftMulai: Date,
    shiftSelesai: Date,
    izinMulai: Date,
    izinSelesai: Date,
  ): boolean {
    const mulai = izinMulai.getTime();
    const selesai = izinSelesai.getTime() + 24 * 60 * 60 * 1000 - 1;

    const sMulai = shiftMulai.getTime();
    const sSelesai = shiftSelesai.getTime();

    return sMulai <= selesai && sSelesai >= mulai;
  }

  async findPendingOrphaned() {
    const pending = await this.prisma.pengajuanIzin.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        karyawanId: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        jenis: true,
        alasan: true,
        dokumenPendukungUrl: true,
        status: true,
        catatanSupervisor: true,
        createdAt: true,
        karyawan: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    if (pending.length === 0) return [];

    const orphanedFlags = await Promise.all(
      pending.map((p) =>
        this.isOrphaned(p.karyawanId, p.tanggalMulai, p.tanggalSelesai),
      ),
    );

    return pending.filter((_, idx) => orphanedFlags[idx]);
  }

  private async isOrphaned(
    karyawanId: string,
    tanggalMulai: Date,
    tanggalSelesai: Date,
  ): Promise<boolean> {
    const allSupervisedSites = await this.prisma.supervisorSite.findMany({
      select: { siteId: true },
    });
    const siteIds = [...new Set(allSupervisedSites.map((s) => s.siteId))];

    const jadwalShifts = await this.prisma.jadwalShift.findMany({
      where: { siteId: { in: siteIds }, karyawanId },
      select: { jamMulai: true, jamSelesai: true },
    });

    const hasAnySupervisorScope = jadwalShifts.some((j) =>
      this.checkOverlap(j.jamMulai, j.jamSelesai, tanggalMulai, tanggalSelesai),
    );

    return !hasAnySupervisorScope;
  }

  /**
   * Verifikasi bahwa caller (role+userId) berhak mengakses PengajuanIzin.
   *
   * - KARYAWAN: lewati (harus dicek oleh caller, karena logicnya beda per use-case)
   * - SUPERVISOR: lempar 404 IZIN_TIDAK_DITEMUKAN jika di luar cakupan (hide existence)
   * - HR_ADMIN:
   *     • jika hrAdminThrows404WhenNotOrphaned=true (getDocumentFile): lempar 404 IZIN_TIDAK_DITEMUKAN
   *     • jika false (processRequest): lempar 403 BUKAN_FALLBACK_HR (behavior lama yang sudah teruji)
   *
   * Refactor ini tidak mengubah behavior processRequest() yang sudah teruji.
   */
  private async assertCallerInScope(
    leaveRequest: {
      karyawanId: string;
      tanggalMulai: Date;
      tanggalSelesai: Date;
    },
    role: Role,
    userId: string,
    hrAdminThrows404WhenNotOrphaned: boolean,
  ): Promise<void> {
    if (role === Role.SUPERVISOR) {
      const supervisedSites = await this.prisma.supervisorSite.findMany({
        where: { supervisorId: userId },
        select: { siteId: true },
      });
      const siteIds = supervisedSites.map((s) => s.siteId);

      const jadwalShifts = await this.prisma.jadwalShift.findMany({
        where: { siteId: { in: siteIds }, karyawanId: leaveRequest.karyawanId },
        select: { jamMulai: true, jamSelesai: true },
      });

      const isInScope = jadwalShifts.some((j) =>
        this.checkOverlap(
          j.jamMulai,
          j.jamSelesai,
          leaveRequest.tanggalMulai,
          leaveRequest.tanggalSelesai,
        ),
      );

      if (!isInScope) {
        throw new NotFoundException({
          code: 'IZIN_TIDAK_DITEMUKAN',
          message: 'Pengajuan izin tidak ditemukan',
        });
      }
    } else if (role === Role.HR_ADMIN) {
      const isOrphaned = await this.isOrphaned(
        leaveRequest.karyawanId,
        leaveRequest.tanggalMulai,
        leaveRequest.tanggalSelesai,
      );

      if (!isOrphaned) {
        if (hrAdminThrows404WhenNotOrphaned) {
          // Endpoint getDocumentFile: sembunyikan keberadaan data (prinsip AGENTS.md 404 vs 403)
          throw new NotFoundException({
            code: 'IZIN_TIDAK_DITEMUKAN',
            message: 'Pengajuan izin tidak ditemukan',
          });
        } else {
          // processRequest(): behavior lama — 403 BUKAN_FALLBACK_HR (sudah teruji, tidak diubah)
          throw new ForbiddenException({
            code: 'BUKAN_FALLBACK_HR',
            message:
              'Pengajuan ini masih dalam cakupan supervisor, gunakan alur approval normal.',
          });
        }
      }
    }
  }

  async processRequest(
    id: string,
    role: Role,
    userId: string,
    action: 'APPROVED' | 'REJECTED',
    dto: ProcessLeaveRequestDto,
  ) {
    // a. Cari PengajuanIzin
    const leaveRequest = await this.prisma.pengajuanIzin.findUnique({
      where: { id },
      select: {
        id: true,
        karyawanId: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        status: true,
      },
    });

    // b. Kalau tidak ketemu -> 404 NOT_FOUND
    if (!leaveRequest) {
      throw new NotFoundException({
        code: 'IZIN_TIDAK_DITEMUKAN',
        message: 'Pengajuan izin tidak ditemukan',
      });
    }

    // c. Cek scope (reuse assertCallerInScope, pertahankan behavior lama: HR_ADMIN non-orphaned → 403)
    await this.assertCallerInScope(leaveRequest, role, userId, false);

    // d. Kalau ketemu & dalam scope tapi status BUKAN PENDING -> 409
    if (leaveRequest.status !== 'PENDING') {
      throw new ConflictException({
        code: 'IZIN_SUDAH_DIPROSES',
        message: 'Pengajuan sudah diproses, tidak bisa diubah lagi',
      });
    }

    // e. Eksekusi update PAKAI CONDITIONAL UPDATE
    const updatedCount = await this.prisma.pengajuanIzin.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: action,
        catatanSupervisor: dto.catatanSupervisor,
        approvedById: userId,
      },
    });

    // f. Kalau hasil updateMany count === 0 -> kalah race
    if (updatedCount.count === 0) {
      throw new ConflictException({
        code: 'IZIN_SUDAH_DIPROSES',
        message: 'Pengajuan sudah diproses, tidak bisa diubah lagi',
      });
    }

    if (action === 'APPROVED') {
      try {
        const { gte: startOfPeriode, lt: endOfPeriode } = getJakartaDateRange(
          formatJakartaDate(leaveRequest.tanggalMulai),
          formatJakartaDate(leaveRequest.tanggalSelesai),
        );

        const jadwals = await this.prisma.jadwalShift.findMany({
          where: {
            karyawanId: leaveRequest.karyawanId,
            tanggal: {
              gte: startOfPeriode,
              lt: endOfPeriode,
            },
          },
          select: { siteId: true, tanggal: true },
        });

        const pairSet = new Set<string>();
        for (const j of jadwals) {
          const tStr = formatJakartaDate(j.tanggal);
          pairSet.add(`${j.siteId}|${tStr}`);
        }

        for (const pair of pairSet) {
          const [sId, tStr] = pair.split('|');
          await this.dashboardService.invalidateDashboardCache(sId, tStr);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to invalidate dashboard cache for approved leave ${id}: ${msg}`,
        );
      }
    }

    // g. Return
    return {
      id,
      status: action,
    };
  }

  async cancel(userId: string, id: string) {
    const leaveRequest = await this.prisma.pengajuanIzin.findUnique({
      where: { id },
    });

    if (!leaveRequest || leaveRequest.karyawanId !== userId) {
      throw new NotFoundException({
        code: 'IZIN_TIDAK_DITEMUKAN',
        message: 'Pengajuan izin tidak ditemukan',
      });
    }

    if (leaveRequest.status !== 'PENDING') {
      throw new ConflictException({
        code: 'TIDAK_BISA_DIBATALKAN',
        message: 'Pengajuan sudah diproses, tidak bisa dibatalkan',
      });
    }

    const updated = await this.prisma.pengajuanIzin.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: { id: true, status: true },
    });

    return updated;
  }

  async getHistory(query: FindLeaveRequestsHistoryQueryDto) {
    const where: Prisma.PengajuanIzinWhereInput = {};

    if (query.karyawanId) {
      where.karyawanId = query.karyawanId;
    }

    if (query.periodeMulai || query.periodeSelesai) {
      where.tanggalMulai = {};
      if (query.periodeMulai) {
        where.tanggalMulai.gte = getJakartaStartOfDay(query.periodeMulai);
      }
      if (query.periodeSelesai) {
        const { lt: endNextDay } = getJakartaSingleDayRange(
          query.periodeSelesai,
        );
        where.tanggalMulai.lt = endNextDay;
      }
    }

    const results = await this.prisma.pengajuanIzin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        karyawanId: true,
        karyawan: { select: { id: true, nama: true } },
        tanggalMulai: true,
        tanggalSelesai: true,
        jenis: true,
        alasan: true,
        dokumenPendukungUrl: true,
        status: true,
        catatanSupervisor: true,
        approvedById: true,
        approvedBy: { select: { id: true, nama: true } },
        createdAt: true,
      },
    });

    return results;
  }

  private static readonly MIME_MAP: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };

  async getDocumentFile(
    id: string,
    role: Role,
    userId: string,
  ): Promise<{ stream: StreamableFile; mimeType: string }> {
    // 1. Cari PengajuanIzin
    const leaveRequest = await this.prisma.pengajuanIzin.findUnique({
      where: { id },
      select: {
        id: true,
        karyawanId: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        dokumenPendukungUrl: true,
      },
    });

    // 2. Tidak ketemu → 404
    if (!leaveRequest) {
      throw new NotFoundException({
        code: 'IZIN_TIDAK_DITEMUKAN',
        message: 'Pengajuan izin tidak ditemukan',
      });
    }

    // 3. Scope check per role
    if (role === Role.KARYAWAN) {
      // KARYAWAN hanya boleh akses milik sendiri, sembunyikan keberadaan (404, bukan 403)
      if (leaveRequest.karyawanId !== userId) {
        throw new NotFoundException({
          code: 'IZIN_TIDAK_DITEMUKAN',
          message: 'Pengajuan izin tidak ditemukan',
        });
      }
    } else {
      // SUPERVISOR dan HR_ADMIN: reuse assertCallerInScope
      // HR_ADMIN non-orphaned → 404 (hrAdminThrows404WhenNotOrphaned=true)
      await this.assertCallerInScope(leaveRequest, role, userId, true);
    }

    // 4. Validasi dokumen ada di record DB
    if (!leaveRequest.dokumenPendukungUrl) {
      throw new NotFoundException({
        code: 'DOKUMEN_TIDAK_DITEMUKAN',
        message: 'Pengajuan ini tidak memiliki dokumen pendukung',
      });
    }

    // 5. Resolve path & defensive check path traversal
    const storageBase = path.resolve(process.cwd(), 'storage', 'dokumen-izin');
    const resolvedPath = path.resolve(
      process.cwd(),
      leaveRequest.dokumenPendukungUrl,
    );

    if (
      !resolvedPath.startsWith(storageBase + path.sep) &&
      resolvedPath !== storageBase
    ) {
      // Path hasil resolve keluar dari direktori storage/dokumen-izin/ — tolak
      throw new NotFoundException({
        code: 'DOKUMEN_TIDAK_DITEMUKAN',
        message: 'Dokumen tidak ditemukan',
      });
    }

    // 6. Validasi file ada di disk
    try {
      await fs.promises.access(resolvedPath, fs.constants.R_OK);
    } catch {
      // File tidak ada di disk atau tidak bisa dibaca — jangan leak detail error
      throw new NotFoundException({
        code: 'DOKUMEN_TIDAK_DITEMUKAN',
        message: 'Dokumen tidak ditemukan',
      });
    }

    // 7. Tentukan MIME type dari ekstensi file
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType =
      LeaveRequestsService.MIME_MAP[ext] ?? 'application/octet-stream';

    // 8. Buka file sebagai stream dan kembalikan
    const fileStream = fs.createReadStream(resolvedPath);
    return { stream: new StreamableFile(fileStream), mimeType };
  }
}
