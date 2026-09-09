import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: TenantStatus, example: TenantStatus.ACTIVE })
  @IsEnum(TenantStatus)
  status!: TenantStatus;
}
