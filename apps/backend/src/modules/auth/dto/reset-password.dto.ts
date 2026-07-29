import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Token tidak boleh kosong' })
  @Matches(/^\d{6}$/, { message: 'Token harus berupa 6 digit angka' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Password baru tidak boleh kosong' })
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  passwordBaru: string;
}
