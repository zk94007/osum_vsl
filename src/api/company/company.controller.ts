import {Controller, UseGuards} from '@nestjs/common';
import {Crud, CrudController, Override, ParsedRequest, CrudRequest, ParsedBody, CreateManyDto} from '@nestjsx/crud';

import {Company} from './company.entity';
import {CompanyService} from './company.service';
import {Auth} from '../auth/auth.decorator';

@Crud({
  model: {
    type: Company
  },
  routes: {
    exclude: ['createManyBase']
  }
})
@Controller('company')
export class CompanyController implements CrudController<Company> {
  constructor(public service: CompanyService) {}

  get base(): CrudController<Company> {
    return this;
  }

  @Override()
  getOne(@ParsedRequest() req: CrudRequest) {
    return this.base.getOneBase(req);
  }

  @Auth()
  @Override()
  getMany(@ParsedRequest() req: CrudRequest) {
    return this.base.getManyBase(req);
  }

  @Auth()
  @Override()
  createOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Company) {
    return this.base.createOneBase(req, dto);
  }

  @Auth('companyadmin', 'superadmin')
  @Override()
  updateOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Company) {
    return this.base.updateOneBase(req, dto);
  }

  @Auth('companyadmin', 'superadmin')
  @Override()
  replaceOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Company) {
    return this.base.replaceOneBase(req, dto);
  }

  @Auth('companyadmin', 'superadmin')
  @Override()
  deleteOne(@ParsedRequest() req: CrudRequest) {
    return this.base.deleteOneBase(req);
  }
}
