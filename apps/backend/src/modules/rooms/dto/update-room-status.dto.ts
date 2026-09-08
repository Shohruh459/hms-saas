import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: RoomStatus, example: RoomStatus.CLEANING })
  @IsEnum(RoomStatus)
  status!: RoomStatus;
}
