import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsLatitude, IsLongitude, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterHotelDto {
  @ApiProperty({ example: 'Grand Samarkand Hotel' })
  @IsString()
  hotelName!: string;

  @ApiProperty({ example: 'grand-samarkand', description: "Faqat kichik lotin harflar, raqam va '-' " })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "subdomain faqat kichik lotin harflar, raqam va '-' belgisidan iborat bo'lishi kerak" })
  subdomain!: string;

  @ApiPropertyOptional({ example: 'Samarqand' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Registon ko\'chasi 12' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 39.654 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 66.9749 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString()
  ownerFullName!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @ApiPropertyOptional({ example: 'owner@example.com' })
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
