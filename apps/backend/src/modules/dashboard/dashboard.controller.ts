import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { GetAttendanceDashboardQueryDto } from './dto/get-attendance-dashboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  @Get('attendance')
  async getAttendance(
    @Request() req: { user: { userId: string; role: Role } },
    @Query() query: GetAttendanceDashboardQueryDto,
  ) {
    return this.dashboardService.getAttendanceDashboard(req.user.userId, query);
  }
}
