import { BadRequestException } from '@nestjs/common';
import { requireTenantId } from './require-tenant-id';

describe('requireTenantId', () => {
  it("tenantId mavjud bo'lsa qaytaradi", () => {
    expect(requireTenantId('tenant-1')).toBe('tenant-1');
  });

  it("tenantId null yoki undefined bo'lsa BadRequestException tashlaydi", () => {
    expect(() => requireTenantId(null)).toThrow(BadRequestException);
    expect(() => requireTenantId(undefined)).toThrow(BadRequestException);
  });
});
