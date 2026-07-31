import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { GetAttendanceReportQueryDto } from './dto/get-attendance-report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

export interface ExpressReportResponse {
  set(field: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HR_ADMIN)
  @Get('export')
  async exportReport(
    @Query() query: GetAttendanceReportQueryDto,
    @Res() res: ExpressReportResponse,
  ) {
    const report = await this.attendanceService.generateAttendanceReport(query);

    res.set('Content-Type', report.mimeType);
    res.set('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.buffer);
  }
}
