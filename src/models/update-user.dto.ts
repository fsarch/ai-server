import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  short_name?: string;
}

