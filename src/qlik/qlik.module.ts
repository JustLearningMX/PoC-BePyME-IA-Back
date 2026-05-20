import { Module } from '@nestjs/common';
import { QlikService } from './qlik.service';
import { QlikController } from './qlik.controller';

@Module({
  controllers: [QlikController],
  providers: [QlikService],
})
export class QlikModule {}
