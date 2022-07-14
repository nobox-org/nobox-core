import { Module } from '@nestjs/common';
import { CustomLogger } from './logger.service';

@Module({
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class LoggerModule {}