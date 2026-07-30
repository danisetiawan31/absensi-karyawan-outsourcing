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

  async findByUserId(userId: string) {
    return this.prisma.notifikasi.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tipe: true,
        pesan: true,
        createdAt: true,
        dibaca: true,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    const result = await this.prisma.notifikasi.updateMany({
      where: { id, userId },
      data: { dibaca: true },
    });
    return result.count;
  }
}
