import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateEmployeeDto {
  @IsNotEmpty({ message: 'nama tidak boleh kosong' })
  @IsString()
  nama: string;

  @IsNotEmpty({ message: 'email tidak boleh kosong' })
  @IsEmail({}, { message: 'format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'role tidak boleh kosong' })
  @IsEnum(Role, {
    message: 'role tidak valid (harus KARYAWAN, SUPERVISOR, atau HR_ADMIN)',
  })
  role: Role;
}
