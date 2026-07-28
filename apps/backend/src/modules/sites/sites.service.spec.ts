import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('SitesService', () => {
  let service: SitesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        {
          provide: PrismaService,
          useValue: {
            site: {
              create: jest.fn().mockResolvedValue({
                id: 'test-site-id',
                nama: 'Test Site',
                alamat: 'Jl. Test No. 1',
                latitude: -6.2,
                longitude: 106.8,
                radiusToleransi: 75,
                statusAktif: true,
              }),
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a site with provided data', async () => {
      const dto = {
        nama: 'Test Site',
        alamat: 'Jl. Test No. 1',
        latitude: -6.2,
        longitude: 106.8,
      };

      const result = await service.create(dto);

      expect(prisma.site.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          radiusToleransi: 75,
        },
      });

      expect(result.id).toBe('test-site-id');
      expect(result.statusAktif).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all sites if no statusAktif is provided', async () => {
      await service.findAll({});
      expect(prisma.site.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { nama: 'asc' },
      });
    });

    it('should return only active sites if statusAktif is true', async () => {
      await service.findAll({ statusAktif: true });
      expect(prisma.site.findMany).toHaveBeenCalledWith({
        where: { statusAktif: true },
        orderBy: { nama: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update and return the site if found', async () => {
      const dto = { alamat: 'Alamat Baru' };
      // mock findUnique to return a site
      (prisma.site.findUnique as jest.Mock).mockResolvedValueOnce({ id: '1' });
      (prisma.site.update as jest.Mock).mockResolvedValueOnce({ id: '1', ...dto });

      const result = await service.update('1', dto);
      expect(prisma.site.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.site.update).toHaveBeenCalledWith({ where: { id: '1' }, data: dto });
      expect(result.alamat).toBe('Alamat Baru');
    });

    it('should throw NotFoundException if site not found', async () => {
      (prisma.site.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const { NotFoundException } = require('@nestjs/common');
      await expect(service.update('1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if site not found', async () => {
      (prisma.site.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const { NotFoundException } = require('@nestjs/common');
      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });

    it('should return without updating if site is already non-active (idempotent)', async () => {
      (prisma.site.findUnique as jest.Mock).mockResolvedValueOnce({ id: '1', statusAktif: false });
      
      await service.remove('1');
      expect(prisma.site.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.site.update).not.toHaveBeenCalled();
    });

    it('should update statusAktif to false if site is active', async () => {
      (prisma.site.findUnique as jest.Mock).mockResolvedValueOnce({ id: '1', statusAktif: true });
      (prisma.site.update as jest.Mock).mockResolvedValueOnce({ id: '1', statusAktif: false });
      
      await service.remove('1');
      expect(prisma.site.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.site.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { statusAktif: false },
      });
    });
  });
});


