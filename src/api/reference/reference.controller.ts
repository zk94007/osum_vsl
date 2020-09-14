import {Controller, UseGuards} from '@nestjs/common';
import {Crud, CrudController, ParsedBody, CrudRequest, ParsedRequest, Override, CreateManyDto} from '@nestjsx/crud';

import {Reference} from './reference.entity';
import {ReferenceService} from './reference.service';
import * as xss from 'xss';
import {Auth} from '../auth/auth.decorator';

@Crud({
  model: {
    type: Reference
  }
})
@Auth()
@Controller('reference')
export class ReferenceController implements CrudController<Reference> {
  constructor(public service: ReferenceService) {}

  get base(): CrudController<Reference> {
    return this;
  }

  @Override()
  createOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Reference) {
    dto.text = xss.filterXSS(dto.text);
    return this.base.createOneBase(req, dto);
  }

  @Override()
  createMany(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: CreateManyDto<Reference>) {
    for (let reference of dto.bulk) {
      reference.text = xss.filterXSS(reference.text);
    }
    return this.base.createManyBase(req, dto);
  }

  @Override()
  updateOneBase(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Reference) {
    dto.text = xss.filterXSS(dto.text);
    return this.base.updateOneBase(req, dto);
  }

  @Override()
  replaceOneBase(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Reference) {
    dto.text = xss.filterXSS(dto.text);
    return this.base.replaceOneBase(req, dto);
  }
}
