import { IsUUID } from 'class-validator';
import { GetAttendanceSummaryQueryDto } from './get-attendance-summary-query.dto';

export class GetAttendanceAttemptsQueryDto extends GetAttendanceSummaryQueryDto {
  @IsUUID('4', { message: 'karyawanId harus berupa UUID yang valid' })
  karyawanId!: string;
}
