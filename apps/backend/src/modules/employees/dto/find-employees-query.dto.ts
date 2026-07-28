import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { Role } from '@prisma/client';

export class FindEmployeesQueryDto {
  @IsOptional()
  @IsEnum(Role, {
    message: 'role tidak valid (harus KARYAWAN, SUPERVISOR, atau HR_ADMIN)',
  })
  role?: Role;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean({ message: 'statusAktif harus berupa boolean (true/false)' })
  statusAktif?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
