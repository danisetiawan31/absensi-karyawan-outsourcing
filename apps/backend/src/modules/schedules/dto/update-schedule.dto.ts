import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsUUID('4', { message: 'karyawanId harus berupa UUID yang valid' })
  karyawanId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'siteId harus berupa UUID yang valid' })
  siteId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format tanggal harus YYYY-MM-DD',
  })
  tanggal?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Format jam mulai harus HH:mm (00:00 - 23:59)',
  })
  jamMulai?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Format jam selesai harus HH:mm (00:00 - 23:59)',
  })
  jamSelesai?: string;
}
