import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

import { HealthController } from './health.controller';
import { EventLoopHealthIndicator } from './event-loop.health';
import { DrizzleHealthIndicator } from './drizzle.health';
import { DrizzleModule } from '@/models/model.module';

@Module({
  imports: [TerminusModule, HttpModule, DrizzleModule],
  controllers: [HealthController],
  providers: [EventLoopHealthIndicator, DrizzleHealthIndicator],
})
export class HealthModule {}
