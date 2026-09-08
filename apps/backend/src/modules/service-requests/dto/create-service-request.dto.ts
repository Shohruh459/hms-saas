import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateServiceRequestDto {
  @ApiProperty({ description: 'Mehmon turgan xona ID', example: 'e2c1f7f0-1234-4a5b-9abc-1234567890ab' })
  @IsUUID()
  roomId!: string;

  @ApiProperty({ description: "Chaqirish sababi (majburiy)", example: 'Sochiq kerak' })
  @IsNotEmpty()
  reason!: string;
}
