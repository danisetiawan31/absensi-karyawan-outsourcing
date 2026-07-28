import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { FindSitesQueryDto } from './dto/find-sites-query.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async create(createSiteDto: CreateSiteDto) {
    const { nama, alamat, latitude, longitude, radiusToleransi } = createSiteDto;

    const site = await this.prisma.site.create({
      data: {
        nama,
        alamat,
        latitude,
        longitude,
        radiusToleransi: radiusToleransi ?? 75,
      },
    });

    return site;
  }

  async findAll(query: FindSitesQueryDto) {
    const { statusAktif } = query;
    
    const where = statusAktif !== undefined ? { statusAktif } : {};

    return this.prisma.site.findMany({
      where,
      orderBy: { nama: 'asc' },
    });
  }

  async update(id: string, updateSiteDto: UpdateSiteDto) {
    const site = await this.prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Data site tidak ditemukan',
      });
    }

    return this.prisma.site.update({
      where: { id },
      data: updateSiteDto,
    });
  }

  async remove(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Data site tidak ditemukan',
      });
    }

    if (site.statusAktif === false) {
      return; // Idempotent: tidak perlu update lagi
    }

    await this.prisma.site.update({
      where: { id },
      data: { statusAktif: false },
    });
  }
}
