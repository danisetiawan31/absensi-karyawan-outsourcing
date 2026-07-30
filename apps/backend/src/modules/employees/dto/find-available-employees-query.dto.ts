import { IsUUID, Matches } from 'class-validator';

export class FindAvailableEmployeesQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'tanggal harus format YYYY-MM-DD',
  })
  tanggal: string;

  @IsUUID()
  siteId: string;
}
