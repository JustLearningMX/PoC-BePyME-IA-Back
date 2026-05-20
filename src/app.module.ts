import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QlikModule } from './qlik/qlik.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), QlikModule],
})
export class AppModule {}
