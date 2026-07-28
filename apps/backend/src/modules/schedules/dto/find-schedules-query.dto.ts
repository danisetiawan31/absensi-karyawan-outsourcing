import { IsOptional, IsUUID, Matches } from 'class-validator';

export class FindSchedulesQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Format tanggal harus YYYY-MM-DD',
  })
  tanggal: string;

  @IsOptional()
  @IsUUID('4', { message: 'siteId harus berupa UUID yang valid' })
  siteId?: string;
}
