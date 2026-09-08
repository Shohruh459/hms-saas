import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListServiceRequestsDto {
  @ApiPropertyOptional({ enum: ServiceRequestStatus })
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;
}
