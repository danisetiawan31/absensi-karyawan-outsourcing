import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SitesModule } from './modules/sites/sites.module';

@Module({
  imports: [PrismaModule, AuthModule, SitesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
