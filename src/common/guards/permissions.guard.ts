import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRule = this.reflector.get<string>('rule', context.getHandler());
    if (!requiredRule) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.permissions?.includes(requiredRule)) {
      throw new ForbiddenException(`Acesso negado: Requer regra ${requiredRule}`);
    }
    return true;
  }
}
