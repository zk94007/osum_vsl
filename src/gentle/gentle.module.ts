import { Module, HttpModule } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GentleCommand } from './gentle.command';
import { GentleProcessor } from './gentle.processor';
import { GENTLEPROCESSOR } from '../shared/processors.constant';
import { GentleService } from './gentle.service';

@Module({
  imports: [
    HttpModule,
    SharedModule,
    BullModule.registerQueueAsync({
      name: GENTLEPROCESSOR,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('QUEUE_HOST'),
          port: +configService.get('QUEUE_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [GentleCommand, GentleProcessor, GentleService],
})
export class GentleModule {}
