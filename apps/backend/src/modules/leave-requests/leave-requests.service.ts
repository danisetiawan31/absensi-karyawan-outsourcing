import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
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
}
