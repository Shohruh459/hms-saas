import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FindMyTicketsDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @MinLength(5)
  phone!: string;
}
