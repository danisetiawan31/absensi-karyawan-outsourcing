import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SitesModule } from './modules/sites/sites.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { SupervisorSitesModule } from './modules/supervisor-sites/supervisor-sites.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { FaceVerificationModule } from './modules/face-verification/face-verification.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SitesModule,
    EmployeesModule,
    SupervisorSitesModule,
    SchedulesModule,
    LeaveRequestsModule,
    FaceVerificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
