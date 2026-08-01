import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface FaceLiveness {
  isLive: boolean;
  confidence: number;
}

export interface EmbedFaceResponse {
  embedding: number[];
  liveness: FaceLiveness;
}

@Injectable()
export class FaceVerificationService {
  private readonly faceServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly httpService: HttpService) {
    this.faceServiceUrl =
      process.env.FACE_SERVICE_URL || 'http://localhost:8000';
    this.timeoutMs = parseInt(
      process.env.FACE_SERVICE_TIMEOUT_MS || '190000',
      10,
    );
  }

  async embedFace(fotoBase64: string): Promise<EmbedFaceResponse> {
    // BYPASS SEMENTARA — lihat AGENTS.md, hapus setelah RAM upgrade
    if (process.env.SKIP_FACE_VERIFICATION === 'true') {
      return {
        embedding: [0.1, 0.2, 0.3],
        liveness: {
          isLive: true,
          confidence: 1.0,
        },
      };
    }

    const url = `${this.faceServiceUrl}/internal/embed`;

    const response = await firstValueFrom(
      this.httpService
        .post<EmbedFaceResponse>(
          url,
          { foto: fotoBase64 },
          { timeout: this.timeoutMs },
        )
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response) {
              // 400 or 422 with { error: { code, message } }
              const data = error.response.data;
              if (data && typeof data === 'object' && 'error' in data) {
                const errObj = (data as Record<string, unknown>).error;
                if (
                  errObj &&
                  typeof errObj === 'object' &&
                  'code' in errObj &&
                  'message' in errObj
                ) {
                  throw new HttpException(
                    {
                      code: (errObj as Record<string, unknown>).code as string,
                      message: (errObj as Record<string, unknown>)
                        .message as string,
                    },
                    error.response.status,
                  );
                }
              }
              // Generic fallback for other 4xx/5xx responses from python
              throw new HttpException(
                {
                  code: 'FACE_SERVICE_ERROR',
                  message: 'Terjadi kesalahan pada face service',
                },
                error.response.status,
              );
            }
            // Network failure / timeout (no response body)
            throw new HttpException(
              {
                code: 'FACE_SERVICE_UNAVAILABLE',
                message: 'Face service tidak dapat dihubungi atau timeout',
              },
              HttpStatus.SERVICE_UNAVAILABLE, // 503
            );
          }),
        ),
    );

    return response.data;
  }
}
