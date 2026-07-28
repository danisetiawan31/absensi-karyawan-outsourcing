import { IsNotEmpty, IsUUID, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsNotEmpty({ message: 'karyawanId tidak boleh kosong' })
  @IsUUID('4', { message: 'karyawanId harus berupa UUID valid' })
  karyawanId: string;

  @IsNotEmpty({ message: 'siteId tidak boleh kosong' })
  @IsUUID('4', { message: 'siteId harus berupa UUID valid' })
  siteId: string;

  @IsNotEmpty({ message: 'tanggal tidak boleh kosong' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'tanggal harus berformat YYYY-MM-DD',
  })
  tanggal: string;

  @IsNotEmpty({ message: 'jamMulai tidak boleh kosong' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'jamMulai harus berformat HH:mm',
  })
  jamMulai: string;

  @IsNotEmpty({ message: 'jamSelesai tidak boleh kosong' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'jamSelesai harus berformat HH:mm',
  })
  jamSelesai: string;
}
