import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class GrantSuperadminAccessDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  email!: string;
}
