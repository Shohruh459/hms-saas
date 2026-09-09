import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperadminAccessGuard } from './superadmin-access.guard';
import { SuperadminAccessService } from '../../modules/admin/superadmin-access.service';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('SuperadminAccessGuard', () => {
  let accessService: { isAllowed: jest.Mock };
  let guard: SuperadminAccessGuard;

  beforeEach(() => {
    accessService = { isAllowed: jest.fn() };
    guard = new SuperadminAccessGuard(accessService as unknown as SuperadminAccessService);
  });

  it('foydalanuvchida email bo\'lmasa ForbiddenException tashlaydi', async () => {
    await expect(guard.canActivate(contextWithUser({ id: '1', email: null }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(accessService.isAllowed).not.toHaveBeenCalled();
  });

  it('ruxsat berilmagan pochta uchun ForbiddenException tashlaydi', async () => {
    accessService.isAllowed.mockResolvedValue(false);
    await expect(guard.canActivate(contextWithUser({ id: '1', email: 'stranger@example.com' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('ruxsat berilgan pochta uchun true qaytaradi', async () => {
    accessService.isAllowed.mockResolvedValue(true);
    await expect(guard.canActivate(contextWithUser({ id: '1', email: 'ally@example.com' }))).resolves.toBe(true);
  });
});
