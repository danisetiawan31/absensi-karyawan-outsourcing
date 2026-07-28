import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsEnum(Role, {
    message: 'role tidak valid (harus KARYAWAN, SUPERVISOR, atau HR_ADMIN)',
  })
  role?: Role;

  @IsOptional()
  @IsBoolean({ message: 'statusAktif harus berupa boolean' })
  statusAktif?: boolean;
}
