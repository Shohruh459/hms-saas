import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketStatus, SupportTicketType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListSupportTicketsDto {
  @ApiPropertyOptional({ enum: SupportTicketStatus })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: SupportTicketType })
  @IsOptional()
  @IsEnum(SupportTicketType)
  type?: SupportTicketType;
}
