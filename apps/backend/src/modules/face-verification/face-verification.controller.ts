import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FaceVerificationService } from './face-verification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Controller('users')
export class FaceVerificationController {
  constructor(
    private readonly faceVerificationService: FaceVerificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('me/face-registration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KARYAWAN)
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: 5 * 1024 * 1024 }, // limit 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png)$/)) {
          return cb(
            new HttpException(
              {
                code: 'FORMAT_FILE_TIDAK_VALID',
                message: 'Hanya menerima format gambar (jpg, jpeg, png)',
              },
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async registerFace(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: { user: JwtPayload },
  ) {
    if (!file) {
      throw new HttpException(
        {
          code: 'FOTO_WAJIB_DIUNGGAH',
          message: 'Foto wajib diunggah',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { faceEmbedding: true },
    });

    if (!currentUser) {
      throw new HttpException(
        {
          code: 'USER_TIDAK_DITEMUKAN',
          message: 'User tidak ditemukan',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (currentUser.faceEmbedding && currentUser.faceEmbedding.length > 0) {
      throw new HttpException(
        {
          code: 'WAJAH_SUDAH_TERDAFTAR',
          message: 'Wajah sudah terdaftar, tidak bisa mendaftar ulang',
        },
        HttpStatus.CONFLICT,
      );
    }

    const base64Foto = file.buffer.toString('base64');
    const result = await this.faceVerificationService.embedFace(base64Foto);

    await this.prisma.user.update({
      where: { id: req.user.userId },
      data: { faceEmbedding: result.embedding },
    });

    return { success: true };
  }
}
