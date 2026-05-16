// src/auth/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách role được phép từ @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không có @Roles() → không áp dụng guard
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Role được gửi từ FE trong body hoặc query (pattern hiện có của project)
    const role: string =
      (request.body?.role as string) ||
      (request.query?.role as string) ||
      '';

    if (!role) {
      throw new ForbiddenException('Thiếu thông tin phân quyền (role)!');
    }

    const hasRole = requiredRoles.some(
      (r) => r.toUpperCase() === role.toUpperCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này! Yêu cầu quyền: ${requiredRoles.join(' hoặc ')}.`,
      );
    }

    return true;
  }
}