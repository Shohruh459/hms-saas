import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class StaffFulfillDto {
  @ApiProperty({ description: 'true = Bajarildi (COMPLETED), false = Bajara olmadim (FAILED)' })
  @IsBoolean()
  completed!: boolean;

  @ApiPropertyOptional({ example: 'Sochiq xonaga yetkazildi' })
  @IsOptional()
  @IsString()
  staffNotes?: string;
}
