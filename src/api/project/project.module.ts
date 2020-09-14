import {Module} from '@nestjs/common';
import {ProjectService} from './project.service';
import {ProjectController} from './project.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Project} from './project.entity';
import {SharedModule} from 'src/shared/shared.module';
import {UserModule} from '../user/user.module';
import {ApiModule} from '../api.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [ProjectService],
  controllers: [ProjectController]
})
export class ProjectModule {}
