import {
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly isCustomClient: boolean;

  constructor(@Optional() @Inject(REDIS_CLIENT) customClient?: Redis) {
    if (customClient) {
      this.client = customClient;
      this.isCustomClient = true;
    } else {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      this.client = new Redis({
        host,
        port,
        lazyConnect: false,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
      this.isCustomClient = false;

      this.client.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });
    }
  }

  async onModuleDestroy() {
    if (!this.isCustomClient && this.client) {
      await this.client.quit().catch(() => {
        this.client.disconnect();
      });
    }
  }

  /**
   * Catatan Serialisasi Date:
   * Objek Date Prisma akan ter-serialize menjadi string ISO 8601 (misal "2026-08-07T00:00:00.000Z")
   * oleh JSON.stringify. Hasil get<T>() akan mengembalikan field Date tersebut sebagai String ISO.
   * Konsumen downstream pada Stage 2/3 harus memperhatikan hal ini saat memproses data hasil cache-hit.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache get failed for key "${key}": ${msg}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache set failed for key "${key}": ${msg}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cache del failed for key "${key}": ${msg}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          keysToDelete.push(...keys);
        }
      } while (cursor !== '0');

      if (keysToDelete.length > 0) {
        await this.client.del(...keysToDelete);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Cache delByPattern failed for pattern "${pattern}": ${msg}`,
      );
    }
  }
}
