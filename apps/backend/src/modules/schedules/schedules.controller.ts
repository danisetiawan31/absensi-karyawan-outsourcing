import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  @Post()
  async create(
    @Request() req: { user: { userId: string; role: Role } },
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(req.user.userId, createScheduleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  @Get()
  async findAll(
    @Request() req: { user: { userId: string; role: Role } },
    @Query() query: FindSchedulesQueryDto,
  ) {
    return this.schedulesService.findAll(req.user.userId, query);
  }
}
