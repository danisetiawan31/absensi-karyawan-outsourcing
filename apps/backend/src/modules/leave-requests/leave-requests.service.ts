import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import { FindLeaveRequestsHistoryQueryDto } from './dto/find-leave-requests-history-query.dto';
import { Prisma, Role } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import 'multer';

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateLeaveRequestDto,
    file?: Express.Multer.File,
  ) {
    const tzSuffix = '+07:00';
    const mulai = new Date(`${dto.tanggalMulai}T00:00:00${tzSuffix}`);
    const selesai = new Date(`${dto.tanggalSelesai}T00:00:00${tzSuffix}`);

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

    return {
      id: created.id,
      status: created.status,
    };
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
        code: 'NOT_FOUND',
        message: 'Pengajuan izin tidak ditemukan',
      });
    }

    // c. Cek scope
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
          code: 'NOT_FOUND',
          message: 'Pengajuan izin tidak ditemukan', // SAMA PERSIS dengan 404
        });
      }
    } else if (role === Role.HR_ADMIN) {
      const isOrphaned = await this.isOrphaned(
        leaveRequest.karyawanId,
        leaveRequest.tanggalMulai,
        leaveRequest.tanggalSelesai,
      );

      if (!isOrphaned) {
        throw new ForbiddenException({
          code: 'BUKAN_FALLBACK_HR',
          message:
            'Pengajuan ini masih dalam cakupan supervisor, gunakan alur approval normal.',
        });
      }
    }

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
        code: 'NOT_FOUND',
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
      const tzSuffix = '+07:00';
      if (query.periodeMulai) {
        // Start of the given date in local tz
        const mulaiDate = new Date(`${query.periodeMulai}T00:00:00${tzSuffix}`);
        where.tanggalMulai.gte = mulaiDate;
      }
      if (query.periodeSelesai) {
        // End of the given date in local tz
        const selesaiDate = new Date(
          new Date(`${query.periodeSelesai}T00:00:00${tzSuffix}`).getTime() +
            24 * 60 * 60 * 1000 -
            1,
        );
        where.tanggalMulai.lte = selesaiDate;
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
}
