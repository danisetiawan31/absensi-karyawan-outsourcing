import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Request,
  Body,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { JwtPayload } from '../../common/types/jwt-payload.type';

import { CheckOutDto } from './dto/check-out.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(200)
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
  async checkIn(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CheckInDto,
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

    return this.attendanceService.checkIn(req.user.userId, dto, file);
  }

  @Post('check-out')
  @HttpCode(200)
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
  async checkOut(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CheckOutDto,
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

    return this.attendanceService.checkOut(req.user.userId, dto, file);
  }
}
