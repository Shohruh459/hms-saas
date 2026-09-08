import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FindPublicRoomsDto {
  @ApiPropertyOptional({ example: 100000, description: 'Bir kechalik minimal narx' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Bir kechalik maksimal narx' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 2, description: "Kamida shuncha sig'imga ega xonalar" })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: 4, description: 'Kamida shuncha reyting' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minRating?: number;

  @ApiPropertyOptional({ example: 'pool,gym', description: "Vergul bilan ajratilgan qulayliklar ro'yxati" })
  @IsOptional()
  @IsString()
  amenities?: string;
}
