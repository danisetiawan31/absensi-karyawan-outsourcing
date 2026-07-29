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

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SitesModule,
    EmployeesModule,
    SupervisorSitesModule,
    SchedulesModule,
    LeaveRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
