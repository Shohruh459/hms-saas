import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: '101' })
  @IsString()
  roomNumber!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  floor!: number;

  @ApiProperty({ example: 'Standard' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  @IsPositive()
  pricePerNight!: number;

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
