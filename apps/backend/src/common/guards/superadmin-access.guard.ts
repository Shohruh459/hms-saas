import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { SuperadminAccessService } from '../../modules/admin/superadmin-access.service';

/**
 * Superadmin panel/endpoint'lariga kirishni cheklaydi: foydalanuvchining
 * `role` maydoni SUPER_ADMIN bo'lishi kifoya emas — uning pochtasi
 * ROOT_SUPER_ADMIN_EMAIL yoki shu pochta ruxsat bergan ro'yxatda bo'lishi
 * shart (SuperadminAccessService).
 */
@Injectable()
export class SuperadminAccessGuard implements CanActivate {
  constructor(private readonly accessService: SuperadminAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email = request.user?.email;

    if (!email || !(await this.accessService.isAllowed(email))) {
      throw new ForbiddenException('Superadmin panelidan foydalanish huquqi berilmagan');
    }

    return true;
  }
}
