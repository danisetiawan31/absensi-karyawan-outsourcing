import { Module } from '@nestjs/common';
import { AttendanceCronService } from './attendance-cron.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, NotificationsModule, DashboardModule],
  providers: [AttendanceCronService],
})
export class AttendanceCronModule {}
