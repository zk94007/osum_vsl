import {Controller, UseGuards} from '@nestjs/common';
import {Crud, CrudController} from '@nestjsx/crud';

import {Image} from './image.entity';
import {ImageService} from './image.service';
import {Auth} from '../auth/auth.decorator';

@Crud({
  model: {
    type: Image
  }
})
@Auth()
@Controller('image')
export class ImageController implements CrudController<Image> {
  constructor(public service: ImageService) {}
}
