import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateSupervisorSiteDto {
  @IsNotEmpty({ message: 'supervisorId tidak boleh kosong' })
  @IsUUID('4', { message: 'supervisorId harus berupa UUID' })
  supervisorId: string;

  @IsNotEmpty({ message: 'siteId tidak boleh kosong' })
  @IsUUID('4', { message: 'siteId harus berupa UUID' })
  siteId: string;
}
