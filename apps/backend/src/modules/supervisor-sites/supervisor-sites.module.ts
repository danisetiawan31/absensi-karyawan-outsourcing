import { Module } from '@nestjs/common';
import { SupervisorSitesService } from './supervisor-sites.service';
import { SupervisorSitesController } from './supervisor-sites.controller';

@Module({
  providers: [SupervisorSitesService],
  controllers: [SupervisorSitesController],
})
export class SupervisorSitesModule {}
