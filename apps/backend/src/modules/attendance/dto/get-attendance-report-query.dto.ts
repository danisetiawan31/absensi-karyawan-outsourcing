import { IsIn } from 'class-validator';
import { GetAttendanceSummaryQueryDto } from './get-attendance-summary-query.dto';

export class GetAttendanceReportQueryDto extends GetAttendanceSummaryQueryDto {
  @IsIn(['pdf', 'xlsx'], {
    message: 'format harus salah satu dari: pdf, xlsx',
  })
  format!: 'pdf' | 'xlsx';
}
