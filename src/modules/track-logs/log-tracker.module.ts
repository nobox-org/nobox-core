import { Global, Module } from '@nestjs/common';
import { LogTrackerService } from './log-tracker.service';

@Global()
@Module({
   providers: [
      LogTrackerService
   ],
   exports: [LogTrackerService],
})
export class LogTrackerModule { }
