import {Module} from '@nestjs/common';
import {JobService} from './job.service';
import {JobController} from './job.controller';
import {Job} from './job.entity';
import {TypeOrmModule} from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobService],
  controllers: [JobController]
})
export class JobModule {}
