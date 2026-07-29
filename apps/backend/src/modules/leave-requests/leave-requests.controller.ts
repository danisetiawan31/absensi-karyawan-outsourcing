import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import { JwtPayload } from '../../common/types/jwt-payload.type';

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
    @Request() req: { user: JwtPayload },
    @Body() dto: CreateLeaveRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.leaveRequestsService.create(req.user.userId, dto, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KARYAWAN, Role.SUPERVISOR)
  async findAll(
    @Request() req: { user: JwtPayload },
    @Query('status') status?: string,
  ) {
    if (req.user.role === Role.SUPERVISOR) {
      if (status !== 'PENDING') {
        throw new BadRequestException({
          code: 'STATUS_WAJIB_PENDING',
          message:
            'Supervisor hanya boleh melihat pengajuan izin dengan status PENDING',
        });
      }
      return this.leaveRequestsService.findPendingForSupervisor(
        req.user.userId,
      );
    }

    // Role KARYAWAN
    return this.leaveRequestsService.findAll(req.user.userId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KARYAWAN)
  async cancel(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestsService.cancel(req.user.userId, id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  async approve(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessLeaveRequestDto,
  ) {
    return this.leaveRequestsService.processBySupervisor(
      id,
      req.user.userId,
      'APPROVED',
      dto,
    );
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  async reject(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessLeaveRequestDto,
  ) {
    return this.leaveRequestsService.processBySupervisor(
      id,
      req.user.userId,
      'REJECTED',
      dto,
    );
  }
}
