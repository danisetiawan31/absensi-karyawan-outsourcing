import { Matches } from 'class-validator';

export class GetAttendanceSummaryQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'periodeMulai harus berformat YYYY-MM-DD',
  })
  periodeMulai!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'periodeSelesai harus berformat YYYY-MM-DD',
  })
  periodeSelesai!: string;
}
