import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReplyFeedbackDto {
  @ApiProperty({ example: "Kechirasiz, texnik xizmatchi 15 daqiqada xonangizga yetib boradi." })
  @IsString()
  @MinLength(2)
  reply!: string;
}
