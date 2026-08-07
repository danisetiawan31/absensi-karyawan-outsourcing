import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, REDIS_CLIENT } from './cache.service';
import Redis from 'ioredis';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: jest.Mocked<Partial<Redis>>;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Cache Operations', () => {
    it('should set value with JSON serialization and EX TTL', async () => {
      const key = 'test:key';
      const data = { id: 1, name: 'Test', date: new Date('2026-08-07') };
      (mockRedisClient.set as jest.Mock).mockResolvedValue('OK');

      await service.set(key, data, 30);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(data),
        'EX',
        30,
      );
    });

    it('should get and deserialize cached JSON value', async () => {
      const key = 'test:key';
      const expectedData = { id: 1, name: 'Test' };
      (mockRedisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify(expectedData),
      );

      const result = await service.get<typeof expectedData>(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(expectedData);
    });

    it('should return null when get encounters cache miss', async () => {
      (mockRedisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should delete a single key', async () => {
      (mockRedisClient.del as jest.Mock).mockResolvedValue(1);

      await service.del('test:key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
    });

    it('should delete keys by pattern using SCAN', async () => {
      (mockRedisClient.scan as jest.Mock)
        .mockResolvedValueOnce(['10', ['dashboard:1', 'dashboard:2']])
        .mockResolvedValueOnce(['0', ['dashboard:3']]);
      (mockRedisClient.del as jest.Mock).mockResolvedValue(3);

      await service.delByPattern('dashboard:*');

      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'dashboard:*',
        'COUNT',
        100,
      );
      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '10',
        'MATCH',
        'dashboard:*',
        'COUNT',
        100,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'dashboard:1',
        'dashboard:2',
        'dashboard:3',
      );
    });
  });

  describe('Fail-Open Behavior (Redis Failure Resilience)', () => {
    it('should return null on get when Redis rejects with connection error', async () => {
      (mockRedisClient.get as jest.Mock).mockRejectedValue(
        new Error('Redis connection lost'),
      );

      const result = await service.get('any:key');

      expect(result).toBeNull();
    });

    it('should resolve without throwing on set when Redis fails', async () => {
      (mockRedisClient.set as jest.Mock).mockRejectedValue(
        new Error('Redis WRONGTYPE error'),
      );

      await expect(
        service.set('any:key', { data: 1 }, 60),
      ).resolves.toBeUndefined();
    });

    it('should resolve without throwing on del when Redis fails', async () => {
      (mockRedisClient.del as jest.Mock).mockRejectedValue(
        new Error('Redis command timeout'),
      );

      await expect(service.del('any:key')).resolves.toBeUndefined();
    });

    it('should resolve without throwing on delByPattern when SCAN fails', async () => {
      (mockRedisClient.scan as jest.Mock).mockRejectedValue(
        new Error('Redis SCAN timeout'),
      );

      await expect(service.delByPattern('pattern:*')).resolves.toBeUndefined();
    });
  });
});
