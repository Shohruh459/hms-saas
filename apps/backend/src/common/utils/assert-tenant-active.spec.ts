import { ForbiddenException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { assertTenantActive } from './assert-tenant-active';

describe('assertTenantActive', () => {
  it('ACTIVE va muddati o\'tmagan tenant uchun xato tashlamaydi', () => {
    expect(() =>
      assertTenantActive({ status: TenantStatus.ACTIVE, subscriptionEndsAt: null }),
    ).not.toThrow();
  });

  it('ACTIVE va kelajakdagi subscriptionEndsAt uchun xato tashlamaydi', () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(() => assertTenantActive({ status: TenantStatus.ACTIVE, subscriptionEndsAt: future })).not.toThrow();
  });

  it.each([TenantStatus.PENDING, TenantStatus.BLOCKED, TenantStatus.EXPIRED])(
    '%s holatidagi tenant uchun ForbiddenException tashlaydi',
    (status) => {
      expect(() => assertTenantActive({ status, subscriptionEndsAt: null })).toThrow(ForbiddenException);
    },
  );

  it("ACTIVE bo'lsa ham subscriptionEndsAt o'tgan bo'lsa xato tashlaydi", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(() => assertTenantActive({ status: TenantStatus.ACTIVE, subscriptionEndsAt: past })).toThrow(
      ForbiddenException,
    );
  });

  it("xato xabarida bog'lanish raqami bo'lishi kerak", () => {
    try {
      assertTenantActive({ status: TenantStatus.BLOCKED, subscriptionEndsAt: null });
      fail('xato tashlanishi kerak edi');
    } catch (error) {
      expect((error as ForbiddenException).message).toContain('+998933169713');
    }
  });
});
