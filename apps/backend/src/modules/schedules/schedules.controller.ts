import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

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
  @Roles(Role.KARYAWAN)
  @Get('today')
  async findToday(@Request() req: { user: { userId: string; role: Role } }) {
    return this.schedulesService.findToday(req.user.userId);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  @Patch(':id')
  async update(
    @Request() req: { user: { userId: string; role: Role } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(req.user.userId, id, updateScheduleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERVISOR)
  @Delete(':id')
  async remove(
    @Request() req: { user: { userId: string; role: Role } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulesService.remove(req.user.userId, id);
  }
}
