import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'e2c1f7f0-1234-4a5b-9abc-1234567890ab' })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ example: 'https://mehmon.uz/uz/booking/success' })
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty({ example: 'https://mehmon.uz/uz/booking/cancelled' })
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}
