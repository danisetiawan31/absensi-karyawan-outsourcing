import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TipeNotifikasi, Notifikasi } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    jadwalId: string | null,
    tipe: TipeNotifikasi,
    pesan: string,
  ): Promise<Notifikasi> {
    return this.prisma.notifikasi.create({
      data: {
        userId,
        jadwalId,
        tipe,
        pesan,
      },
    });
  }
}
