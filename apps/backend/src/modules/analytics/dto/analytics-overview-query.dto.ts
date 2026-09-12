import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class AnalyticsOverviewQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: "Berilmasa — endDate'dan 29 kun oldin" })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31', description: "Berilmasa — bugungi kun" })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
