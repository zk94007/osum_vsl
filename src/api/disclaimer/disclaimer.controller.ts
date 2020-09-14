import {Controller, UseGuards} from '@nestjs/common';
import {Crud, CrudController, CreateManyDto, ParsedBody, CrudRequest, ParsedRequest, Override} from '@nestjsx/crud';

import {Disclaimer} from './disclaimer.entity';
import {DisclaimerService} from './disclaimer.service';
import * as xss from 'xss';
import {Auth} from '../auth/auth.decorator';

@Crud({
  model: {
    type: Disclaimer
  }
})
@Auth()
@Controller('disclaimer')
export class DisclaimerController implements CrudController<Disclaimer> {
  constructor(public service: DisclaimerService) {}

  get base(): CrudController<Disclaimer> {
    return this;
  }

  @Override()
  createOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Disclaimer) {
    dto.text = xss.filterXSS(dto.text);
    return this.base.createOneBase(req, dto);
  }

  @Override()
  createMany(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: CreateManyDto<Disclaimer>) {
    for (let disclaimer of dto.bulk) {
      disclaimer.text = xss.filterXSS(disclaimer.text);
    }
    return this.base.createManyBase(req, dto);
  }

  @Override()
  updateOneBase(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Disclaimer) {
    dto.text = xss.filterXSS(dto.text);
    return this.base.updateOneBase(req, dto);
  }

  @Override()
  replaceOneBase(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Disclaimer) {
    dto.text = xss.filterXSS(dto.text);
    return this.base.replaceOneBase(req, dto);
  }
}
