import {Controller, UseGuards, Get, Res, Request, UseInterceptors, Req} from '@nestjs/common';
import {Crud, CrudController, Override, ParsedRequest, ParsedBody, CrudRequest, CreateManyDto} from '@nestjsx/crud';
import {Project} from './project.entity';
import {ProjectService} from './project.service';
import * as xss from 'xss';
import {Auth} from '../auth/auth.decorator';

@Crud({
  query: {
    join: {
      createdBy: {eager: false},
      company: {eager: false},
      images: {eager: false},
      disclaimer: {eager: false},
      reference: {eager: false}
    }
  },
  model: {
    type: Project
  }
})
@Auth()
@Controller('project')
export class ProjectController implements CrudController<Project> {
  constructor(public service: ProjectService) {}

  get base(): CrudController<Project> {
    return this;
  }

  setUserFilter(request, req: CrudRequest) {
    req.parsed.filter.push({field: 'companyId', operator: '$eq', value: request.user.companyId});
  }

  @Override()
  getOne(@Request() request, @ParsedRequest() req: CrudRequest) {
    this.setUserFilter(request, req);
    return this.base.getOneBase(req);
  }

  @Override()
  getMany(@Request() request, @ParsedRequest() req: CrudRequest) {
    this.setUserFilter(request, req);
    return this.base.getManyBase(req);
  }

  @Override()
  createOne(@Req() request, @ParsedRequest() req: CrudRequest, @ParsedBody() dto: Project) {
    dto.script = xss.filterXSS(dto.script);
    dto.companyId = request.user.companyId;
    dto.createdById = request.user.userId;
    dto.modifiedById = request.user.userId;
    return this.base.createOneBase(req, dto);
  }

  @Override()
  createMany(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: CreateManyDto<Project>) {
    for (let project of dto.bulk) {
      project.script = xss.filterXSS(project.script);
    }
    return this.base.createManyBase(req, dto);
  }

  @Override()
  updateOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Project) {
    dto.script = xss.filterXSS(dto.script);
    return this.base.updateOneBase(req, dto);
  }

  @Override()
  replaceOne(@ParsedRequest() req: CrudRequest, @ParsedBody() dto: Project) {
    dto.script = xss.filterXSS(dto.script);
    return this.base.replaceOneBase(req, dto);
  }
}
