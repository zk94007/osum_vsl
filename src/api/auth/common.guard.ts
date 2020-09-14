import {Injectable, CanActivate, ExecutionContext, Logger} from '@nestjs/common';
import {Reflector} from '@nestjs/core';

@Injectable()
export class CommonGuard implements CanActivate {
  private readonly logger = new Logger(CommonGuard.name);
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    request.user.userId = request.user[`${process.env.AUTH0_AUDIENCE}/user_meta_data`].userId;
    request.user.companyId = request.user[`${process.env.AUTH0_AUDIENCE}/user_meta_data`].companyId;

    this.logger.debug(request.path);
    this.logger.debug(request.user);

    return (
      !!request.user[`${process.env.AUTH0_AUDIENCE}/user_meta_data`].companyId &&
      !!request.user[`${process.env.AUTH0_AUDIENCE}/user_meta_data`].userId
    );
  }
}
