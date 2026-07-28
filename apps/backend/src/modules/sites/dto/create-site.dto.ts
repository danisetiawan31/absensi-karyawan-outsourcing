import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama site tidak boleh kosong' })
  nama: string;

  @IsString()
  @IsNotEmpty({ message: 'Alamat tidak boleh kosong' })
  alamat: string;

  @IsNumber({}, { message: 'Latitude harus berupa angka' })
  @IsNotEmpty({ message: 'Latitude tidak boleh kosong' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude harus berupa angka' })
  @IsNotEmpty({ message: 'Longitude tidak boleh kosong' })
  longitude: number;

  @IsNumber({}, { message: 'Radius toleransi harus berupa angka' })
  @IsOptional()
  radiusToleransi?: number;
}
