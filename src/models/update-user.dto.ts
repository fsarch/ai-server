import { IsString, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  family_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  given_name?: string;
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  short_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_bot?: boolean;
}

