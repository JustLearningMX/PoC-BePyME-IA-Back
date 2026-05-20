import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StreamQueryDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  threadId!: string;

  @IsOptional()
  @IsString()
  assistantId?: string;
}
