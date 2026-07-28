import { IsOptional, IsUUID } from 'class-validator';

export class FindSupervisorSitesQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'supervisorId harus berupa UUID' })
  supervisorId?: string;
}
