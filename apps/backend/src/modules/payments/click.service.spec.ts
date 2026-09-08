import { createHash } from 'crypto';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { ClickService } from './click.service';

function sign(parts: unknown[]): string {
  return createHash('md5').update(parts.join('')).digest('hex');
}

describe('ClickService', () => {
  const secretKey = 'click-secret';
  const tenant = { id: 'tenant-1', paymentKeys: { click: { merchantId: 'M1', serviceId: 'S1', secretKey } } };
  const booking = { id: 'booking-1', tenantId: 'tenant-1', totalPrice: 100000, tenant };

  let paymentsService: {
    findBookingWithTenant: jest.Mock;
    getPaymentKeys: jest.Mock;
    findPaymentByTransaction: jest.Mock;
    createPendingPayment: jest.Mock;
    markPaymentPaid: jest.Mock;
    markPaymentFailed: jest.Mock;
  };
  let service: ClickService;

  beforeEach(() => {
    paymentsService = {
      findBookingWithTenant: jest.fn(),
      getPaymentKeys: jest.fn((t) => t.paymentKeys ?? {}),
      findPaymentByTransaction: jest.fn(),
      createPendingPayment: jest.fn(),
      markPaymentPaid: jest.fn(),
      markPaymentFailed: jest.fn(),
    };
    service = new ClickService(paymentsService as unknown as PaymentsService);
  });

  describe('prepare', () => {
    const baseBody = {
      click_trans_id: 'ct-1',
      service_id: 'S1',
      merchant_trans_id: 'booking-1',
      amount: 100000,
      action: '0',
      sign_time: '2026-01-01 10:00:00',
    };

    it('booking topilmasa -5 qaytaradi', async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(null);

      const result: any = await service.prepare({ ...baseBody, sign_string: 'irrelevant' });

      expect(result.error).toBe(-5);
    });

    it("noto'g'ri imzo -1 qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);

      const result: any = await service.prepare({ ...baseBody, sign_string: 'wrong-sign' });

      expect(result.error).toBe(-1);
    });

    it("noto'g'ri summa -2 qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);
      const signString = sign([
        baseBody.click_trans_id,
        baseBody.service_id,
        secretKey,
        baseBody.merchant_trans_id,
        50000,
        baseBody.action,
        baseBody.sign_time,
      ]);

      const result: any = await service.prepare({ ...baseBody, amount: 50000, sign_string: signString });

      expect(result.error).toBe(-2);
    });

    it("to'g'ri so'rovda pending Payment yaratadi va muvaffaqiyat qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);
      paymentsService.findPaymentByTransaction.mockResolvedValue(null);
      const signString = sign([
        baseBody.click_trans_id,
        baseBody.service_id,
        secretKey,
        baseBody.merchant_trans_id,
        baseBody.amount,
        baseBody.action,
        baseBody.sign_time,
      ]);

      const result: any = await service.prepare({ ...baseBody, sign_string: signString });

      expect(result.error).toBe(0);
      expect(result.merchant_prepare_id).toBe('ct-1');
      expect(paymentsService.createPendingPayment).toHaveBeenCalledWith(
        'tenant-1',
        'booking-1',
        PaymentProvider.CLICK,
        'ct-1',
        100000,
      );
    });
  });

  describe('complete', () => {
    const completeBody = {
      click_trans_id: 'ct-1',
      service_id: 'S1',
      merchant_trans_id: 'booking-1',
      merchant_prepare_id: 'ct-1',
      amount: 100000,
      action: '1',
      sign_time: '2026-01-01 10:05:00',
      error: '0',
    };

    it('tranzaksiya topilmasa -6 qaytaradi', async () => {
      paymentsService.findPaymentByTransaction.mockResolvedValue(null);

      const result: any = await service.complete({ ...completeBody, sign_string: 'irrelevant' });

      expect(result.error).toBe(-6);
    });

    it("to'g'ri so'rovda to'lovni PAID qiladi", async () => {
      paymentsService.findPaymentByTransaction.mockResolvedValue({
        id: 'payment-1',
        bookingId: 'booking-1',
        status: PaymentStatus.PENDING,
      });
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);
      const signString = sign([
        completeBody.click_trans_id,
        completeBody.service_id,
        secretKey,
        completeBody.merchant_trans_id,
        completeBody.merchant_prepare_id,
        completeBody.amount,
        completeBody.action,
        completeBody.sign_time,
      ]);

      const result: any = await service.complete({ ...completeBody, sign_string: signString });

      expect(result.error).toBe(0);
      expect(result.merchant_confirm_id).toBe('ct-1');
      expect(paymentsService.markPaymentPaid).toHaveBeenCalled();
    });
  });
});
