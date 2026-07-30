import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FaceVerificationService } from '../face-verification/face-verification.service';

@Module({
  imports: [HttpModule],
  providers: [FaceVerificationService],
  exports: [FaceVerificationService],
})
export class FaceVerificationModule {}
