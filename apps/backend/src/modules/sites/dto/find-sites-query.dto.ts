import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindSitesQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'statusAktif harus berupa boolean (true/false)' })
  statusAktif?: boolean;
}
