import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateSiteDto {
  @IsString()
  @IsOptional()
  nama?: string;

  @IsString()
  @IsOptional()
  alamat?: string;

  @IsNumber({}, { message: 'Latitude harus berupa angka' })
  @IsOptional()
  latitude?: number;

  @IsNumber({}, { message: 'Longitude harus berupa angka' })
  @IsOptional()
  longitude?: number;

  @IsNumber({}, { message: 'Radius toleransi harus berupa angka' })
  @IsOptional()
  radiusToleransi?: number;

  @IsBoolean({ message: 'Status aktif harus berupa boolean' })
  @IsOptional()
  statusAktif?: boolean;
}
