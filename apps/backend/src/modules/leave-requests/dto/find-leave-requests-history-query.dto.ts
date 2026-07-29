import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class FindLeaveRequestsHistoryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'karyawanId harus berupa UUID yang valid' })
  karyawanId?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'periodeMulai harus berformat ISO 8601 (contoh: 2026-08-01)' },
  )
  periodeMulai?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'periodeSelesai harus berformat ISO 8601 (contoh: 2026-08-31)' },
  )
  periodeSelesai?: string;
}
