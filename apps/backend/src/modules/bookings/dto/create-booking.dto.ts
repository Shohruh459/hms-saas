import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'e2c1f7f0-1234-4a5b-9abc-1234567890ab' })
  @IsUUID()
  roomId!: string;

  @ApiPropertyOptional({
    description: "Mehmon ID — faqat xodim (RECEPTIONIST/HOTEL_OWNER/SUPER_ADMIN) mehmon nomidan bron qilganda kerak",
    example: 'a1b2c3d4-1234-4a5b-9abc-1234567890ab',
  })
  @IsOptional()
  @IsUUID()
  guestId?: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsISO8601()
  checkIn!: string;

  @ApiProperty({ example: '2026-10-05' })
  @IsISO8601()
  checkOut!: string;
}
