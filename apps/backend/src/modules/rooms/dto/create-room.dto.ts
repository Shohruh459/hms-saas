import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenderPolicy, RoomStatus, RoomType } from '@prisma/client';
import { ArrayUnique, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: '101' })
  @IsString()
  roomNumber!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  floor!: number;

  @ApiProperty({ example: 'Standard', description: "Xona uslubi/darajasi (masalan Standard, Deluxe, Suite)" })
  @IsString()
  category!: string;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  @IsPositive()
  pricePerNight!: number;

  @ApiPropertyOptional({ enum: RoomType, default: RoomType.PRIVATE, description: 'PRIVATE — butun xona, SHARED — koyka asosida (hostel)' })
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @ApiPropertyOptional({ enum: GenderPolicy, default: GenderPolicy.MIXED })
  @IsOptional()
  @IsEnum(GenderPolicy)
  genderPolicy?: GenderPolicy;

  @ApiPropertyOptional({ example: 4, default: 1, description: 'SHARED xonalardagi jami koykalar soni' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalBeds?: number;

  @ApiPropertyOptional({ example: 80000, description: 'SHARED xonalar uchun bitta koyka narxi' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pricePerBed?: number;

  @ApiPropertyOptional({ example: 2, default: 2, description: 'Mehmonlar sig\'imi (kishi soni)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: 4.5, description: '0 dan 5 gacha reyting' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: ['pool', 'gym', 'wifi'], description: "Qulayliklar ro'yxati" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
