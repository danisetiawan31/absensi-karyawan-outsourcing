import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KARYAWAN)
  @UseInterceptors(
    FileInterceptor('dokumen', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async create(
    @Request() req: { user: { userId: string; role: Role } },
    @Body() dto: CreateLeaveRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.leaveRequestsService.create(req.user.userId, dto, file);
  }
}
