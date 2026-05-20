import {
  All,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AssistantQueryDto } from './dto/assistant-query.dto';
import { CreateQlikDto } from './dto/create-qlik.dto';
import { StreamQueryDto } from './dto/stream-query.dto';
import { QlikService } from './qlik.service';

@Controller()
export class QlikController {
  constructor(private readonly qlikService: QlikService) {}

  @Get('health')
  health() {
    return this.qlikService.health();
  }

  @Get('debug/env')
  debugEnv() {
    return this.qlikService.debugEnv();
  }

  @Post('threads')
  createThread(@Body() createQlikDto: CreateQlikDto) {
    return this.qlikService.createThread(createQlikDto);
  }

  @All('stream')
  async stream(
    @Body() body: Partial<StreamQueryDto>,
    @Query() query: Partial<StreamQueryDto>,
    @Res() response: Response,
  ): Promise<void> {
    await this.qlikService.streamAnswers({ ...query, ...body }, response);
  }

  @All('stream-answers')
  async streamAnswersAlias(
    @Query() query: Partial<StreamQueryDto>,
    @Res() response: Response,
  ): Promise<void> {
    await this.qlikService.streamAnswers(query, response);
  }

  @Get('assistant')
  getAssistant(@Query() query: AssistantQueryDto) {
    return this.qlikService.getAssistant(query);
  }

  @Get('users/me')
  getCurrentUser(@Headers('authorization') authorization?: string) {
    return this.qlikService.getCurrentUser(authorization);
  }

  @Get('users/:id')
  getUserById(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.qlikService.getUserById(id, authorization);
  }
}
