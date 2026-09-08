import { ApiProperty } from '@nestjs/swagger';
import { SupportTicketStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const RESPONDABLE_STATUSES = [
  SupportTicketStatus.IN_PROGRESS,
  SupportTicketStatus.RESOLVED,
  SupportTicketStatus.CLOSED,
] as const;

export class RespondSupportTicketDto {
  @ApiProperty({ example: "Muammo bartaraf etildi, rahmat!" })
  @IsString()
  @IsNotEmpty()
  response!: string;

  @ApiProperty({ enum: RESPONDABLE_STATUSES, example: SupportTicketStatus.RESOLVED })
  @IsIn(RESPONDABLE_STATUSES)
  status!: SupportTicketStatus;
}
