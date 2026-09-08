import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminDecisionDto {
  @ApiProperty({ description: 'true = tasdiqlash (APPROVED_BY_ADMIN), false = rad etish (REJECTED_BY_ADMIN)' })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({ example: 'Xizmatchiga yuborildi' })
  @IsOptional()
  @IsString()
  staffNotes?: string;
}
