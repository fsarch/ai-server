import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  external_id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  family_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  given_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  short_name: string;
}
