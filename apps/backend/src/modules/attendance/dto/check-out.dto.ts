import { Type, Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CheckOutDto {
  @IsUUID()
  @IsNotEmpty()
  jadwalId: string;

  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  @IsNotEmpty()
  longitude: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isMocked?: boolean;
}
