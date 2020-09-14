import {Controller} from '@nestjs/common';
import {Crud, CrudController} from '@nestjsx/crud';
import {Auth} from '../auth/auth.decorator';
import {Job} from './job.entity';
import {JobService} from './job.service';

@Crud({
  model: {
    type: Job
  }
})
@Auth()
@Controller('job')
export class JobController implements CrudController<Job> {
  constructor(public service: JobService) {}
}
