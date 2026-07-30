import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsLatitude,
  IsLongitude,
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
}
