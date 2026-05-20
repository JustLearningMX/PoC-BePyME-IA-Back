import { IsOptional, IsString } from 'class-validator';

export class AssistantQueryDto {
  @IsOptional()
  @IsString()
  assistantId?: string;
}
