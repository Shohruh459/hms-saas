import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Xonamda konditsioner ishlamayapti, iltimos yordam bering.' })
  @IsString()
  @MinLength(3)
  message!: string;

  @ApiPropertyOptional({ example: '204' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'Aziz Karimov' })
  @IsOptional()
  @IsString()
  guestName?: string;
}
