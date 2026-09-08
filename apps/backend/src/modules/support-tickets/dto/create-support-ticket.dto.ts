import { ApiProperty } from '@nestjs/swagger';
import { SupportTicketType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportTicketType, example: SupportTicketType.HELP })
  @IsEnum(SupportTicketType)
  type!: SupportTicketType;

  @ApiProperty({ example: 'Xonada issiq suv yo\'q' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
