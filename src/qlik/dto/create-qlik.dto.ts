import { IsOptional, IsString } from 'class-validator';

export class CreateQlikDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  assistantId?: string;
}
