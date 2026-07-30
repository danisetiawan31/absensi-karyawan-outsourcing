import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { FindEmployeesQueryDto } from './dto/find-employees-query.dto';
import { FindAvailableEmployeesQueryDto } from './dto/find-available-employees-query.dto';
import { FindEmployeeSchedulesQueryDto } from './dto/find-employee-schedules-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('available')
  @Roles(Role.SUPERVISOR, Role.HR_ADMIN)
  async findAvailable(
    @Query() query: FindAvailableEmployeesQueryDto,
    @Request() req: { user: { userId: string; role: Role } },
  ) {
    return this.employeesService.findAvailableEmployees(
      query.tanggal,
      query.siteId,
      { id: req.user.userId, role: req.user.role },
    );
  }

  @Get(':id/schedules')
  @Roles(Role.HR_ADMIN)
  async findSchedules(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FindEmployeeSchedulesQueryDto,
  ) {
    return this.employeesService.findEmployeeSchedules(
      id,
      query.tanggalMulai,
      query.tanggalSelesai,
    );
  }

  @Get()
  @Roles(Role.HR_ADMIN)
  async findAll(@Query() query: FindEmployeesQueryDto) {
    return this.employeesService.findAll(query);
  }

  @Patch(':id')
  @Roles(Role.HR_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Post()
  @Roles(Role.HR_ADMIN)
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }
}
