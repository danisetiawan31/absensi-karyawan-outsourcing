import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcessLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  catatanSupervisor?: string;
}
