import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class FailOpenThrottlerGuard extends ThrottlerGuard {
  protected readonly logger = new Logger(FailOpenThrottlerGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (err) {
      if (err instanceof ThrottlerException) {
        throw new HttpException(
          {
            code: 'TERLALU_BANYAK_PERCOBAAN',
            message: 'Terlalu banyak percobaan, coba lagi nanti',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.warn(
        `Throttler storage error (failing open): ${err instanceof Error ? err.message : String(err)}`,
      );
      return true;
    }
  }

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' ? req.ip : '127.0.0.1';
    return Promise.resolve(ip);
  }

  protected throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        code: 'TERLALU_BANYAK_PERCOBAAN',
        message: 'Terlalu banyak percobaan, coba lagi nanti',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
