import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { JenisIzin } from '@prisma/client';

export class CreateLeaveRequestDto {
  @IsDateString()
  tanggalMulai: string;

  @IsDateString()
  tanggalSelesai: string;

  @IsEnum(JenisIzin)
  jenis: JenisIzin;

  @IsString()
  @IsNotEmpty()
  alasan: string;
}
