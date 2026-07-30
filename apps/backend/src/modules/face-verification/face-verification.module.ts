import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FaceVerificationService } from '../face-verification/face-verification.service';
import { FaceVerificationController } from './face-verification.controller';

@Module({
  imports: [HttpModule],
  controllers: [FaceVerificationController],
  providers: [FaceVerificationService],
  exports: [FaceVerificationService],
})
export class FaceVerificationModule {}
