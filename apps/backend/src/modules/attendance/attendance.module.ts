import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { FaceVerificationModule } from '../face-verification/face-verification.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, FaceVerificationModule, DashboardModule],
  controllers: [AttendanceController, ReportsController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
