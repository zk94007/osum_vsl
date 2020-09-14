import {HttpModule, Module} from '@nestjs/common';
import {SharedModule} from '../shared/shared.module';
import {BullModule} from '@nestjs/bull';
import {
  GENTLEPROCESSOR,
  GOOGLETTSPROCESSOR,
  MEDIAPIPEPROCESSOR,
  OPENAIPROCESSOR,
  PIPERPROCESSOR,
  VIDEORENDERPROCESSOR
} from '../shared/processors.constant';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {
  ServicePipeGentleProcessor,
  ServicePipeGoogleTTSProcessor,
  ServicePipeMediaPipeProcessor,
  ServicePipeProcessor,
  ServicePipeVideoRendererProcessor,
  ServicePipeOpenAIProcessor
} from './service-pipe.processor';
import {ServicePipeService} from './service-pipe.service';

@Module({
  imports: [
    HttpModule,
    SharedModule,
    ConfigModule,
    BullModule.registerQueueAsync(
      {
        name: PIPERPROCESSOR,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT')
          }
        }),

        inject: [ConfigService]
      },
      {
        name: VIDEORENDERPROCESSOR,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT')
          }
        }),

        inject: [ConfigService]
      },
      {
        name: GENTLEPROCESSOR,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT')
          }
        }),
        inject: [ConfigService]
      },
      {
        name: GOOGLETTSPROCESSOR,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT')
          }
        }),
        inject: [ConfigService]
      },
      {
        name: OPENAIPROCESSOR,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT')
          }
        }),
        inject: [ConfigService]
      },
      {
        name: MEDIAPIPEPROCESSOR,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT')
          }
        }),
        inject: [ConfigService]
      }
    )
  ],
  providers: [
    ServicePipeGoogleTTSProcessor,
    ServicePipeGentleProcessor,
    ServicePipeProcessor,
    ServicePipeService,
    ServicePipeMediaPipeProcessor,
    ServicePipeVideoRendererProcessor,
    ServicePipeOpenAIProcessor
  ]
})
export class ServicePipeModule {}
