import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(Role.SUPERVISOR)
  async create(
    @Request() req: { user: { userId: string; role: Role } },
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(req.user.userId, createScheduleDto);
  }
}
