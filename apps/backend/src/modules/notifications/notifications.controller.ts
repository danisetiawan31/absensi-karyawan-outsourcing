import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.KARYAWAN, Role.SUPERVISOR)
  async getNotifications(@Request() req: { user: JwtPayload }) {
    return this.notificationsService.findByUserId(req.user.userId);
  }

  @Patch(':id/read')
  @Roles(Role.KARYAWAN, Role.SUPERVISOR)
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: JwtPayload },
  ) {
    const updatedCount = await this.notificationsService.markAsRead(
      id,
      req.user.userId,
    );

    if (updatedCount === 0) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Notifikasi tidak ditemukan',
      });
    }

    return { success: true };
  }
}
