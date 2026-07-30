import { IsNotEmpty, Matches } from 'class-validator';

export class FindEmployeeSchedulesQueryDto {
  @IsNotEmpty({ message: 'tanggalMulai wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'tanggalMulai harus format YYYY-MM-DD',
  })
  tanggalMulai: string;

  @IsNotEmpty({ message: 'tanggalSelesai wajib diisi' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'tanggalSelesai harus format YYYY-MM-DD',
  })
  tanggalSelesai: string;
}
