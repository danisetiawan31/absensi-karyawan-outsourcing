import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SupervisorSitesService } from './supervisor-sites.service';
import { CreateSupervisorSiteDto } from './dto/create-supervisor-site.dto';
import { FindSupervisorSitesQueryDto } from './dto/find-supervisor-sites-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('supervisor-sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupervisorSitesController {
  constructor(
    private readonly supervisorSitesService: SupervisorSitesService,
  ) {}

  @Post()
  @Roles(Role.HR_ADMIN)
  async create(@Body() createSupervisorSiteDto: CreateSupervisorSiteDto) {
    return this.supervisorSitesService.create(createSupervisorSiteDto);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.SUPERVISOR)
  async findAll(
    @Request() req: { user: { userId: string; role: Role } },
    @Query() query: FindSupervisorSitesQueryDto,
  ) {
    const callerId = req.user.userId;
    const callerRole = req.user.role;
    return this.supervisorSitesService.findAll(callerId, callerRole, query);
  }
}
