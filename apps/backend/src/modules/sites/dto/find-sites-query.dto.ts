import { IsBoolean, IsOptional } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

export class FindSitesQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean({ message: 'statusAktif harus berupa boolean (true/false)' })
  statusAktif?: boolean;
}
