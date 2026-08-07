import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { SitesModule } from './modules/sites/sites.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { SupervisorSitesModule } from './modules/supervisor-sites/supervisor-sites.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { FaceVerificationModule } from './modules/face-verification/face-verification.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AttendanceCronModule } from './modules/attendance-cron/attendance-cron.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuthModule,
    SitesModule,
    EmployeesModule,
    SupervisorSitesModule,
    SchedulesModule,
    LeaveRequestsModule,
    FaceVerificationModule,
    AttendanceModule,
    NotificationsModule,
    AttendanceCronModule,
    DashboardModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
