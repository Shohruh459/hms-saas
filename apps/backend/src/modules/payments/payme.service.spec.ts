import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymeService } from './payme.service';

function basicAuth(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

describe('PaymeService', () => {
  const secretKey = 'payme-secret';
  const tenant = { id: 'tenant-1', paymentKeys: { payme: { merchantId: 'PM1', secretKey } } };
  const booking = { id: 'booking-1', tenantId: 'tenant-1', totalPrice: 100000, tenant };
  const authHeader = basicAuth('Paycom', secretKey);

  let paymentsService: {
    findBookingWithTenant: jest.Mock;
    getPaymentKeys: jest.Mock;
    findPaymentByTransaction: jest.Mock;
    findActivePendingPaymentForBooking: jest.Mock;
    createPendingPayment: jest.Mock;
    markPaymentPaid: jest.Mock;
    markPaymentFailed: jest.Mock;
    markPaymentRefunded: jest.Mock;
  };
  let service: PaymeService;

  beforeEach(() => {
    paymentsService = {
      findBookingWithTenant: jest.fn(),
      getPaymentKeys: jest.fn((t) => t.paymentKeys ?? {}),
      findPaymentByTransaction: jest.fn(),
      findActivePendingPaymentForBooking: jest.fn(),
      createPendingPayment: jest.fn(),
      markPaymentPaid: jest.fn(),
      markPaymentFailed: jest.fn(),
      markPaymentRefunded: jest.fn(),
    };
    service = new PaymeService(paymentsService as unknown as PaymentsService);
  });

  describe('CheckPerformTransaction', () => {
    it('booking topilmasa -31050 xato qaytaradi', async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(null);

      const result: any = await service.handle(
        { method: 'CheckPerformTransaction', params: { amount: 10000000, account: { booking_id: 'x' } }, id: 1 },
        authHeader,
      );

      expect(result.error?.code).toBe(-31050);
    });

    it("noto'g'ri parol -32504 xato qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);

      const result: any = await service.handle(
        { method: 'CheckPerformTransaction', params: { amount: 10000000, account: { booking_id: 'booking-1' } }, id: 1 },
        basicAuth('Paycom', 'wrong-secret'),
      );

      expect(result.error?.code).toBe(-32504);
    });

    it("noto'g'ri summa -31001 xato qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);

      const result: any = await service.handle(
        { method: 'CheckPerformTransaction', params: { amount: 1, account: { booking_id: 'booking-1' } }, id: 1 },
        authHeader,
      );

      expect(result.error?.code).toBe(-31001);
    });

    it("to'g'ri so'rovda allow: true qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);

      const result: any = await service.handle(
        { method: 'CheckPerformTransaction', params: { amount: 10000000, account: { booking_id: 'booking-1' } }, id: 1 },
        authHeader,
      );

      expect(result.result).toEqual({ allow: true });
    });
  });

  describe('CreateTransaction', () => {
    it("yangi tranzaksiya yaratadi va state=1 qaytaradi", async () => {
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);
      paymentsService.findPaymentByTransaction.mockResolvedValue(null);
      paymentsService.findActivePendingPaymentForBooking.mockResolvedValue(null);
      paymentsService.createPendingPayment.mockResolvedValue({ id: 'payment-1', createdAt: new Date() });

      const result: any = await service.handle(
        {
          method: 'CreateTransaction',
          params: { id: 'payme-tx-1', time: Date.now(), amount: 10000000, account: { booking_id: 'booking-1' } },
          id: 2,
        },
        authHeader,
      );

      expect(result.result.state).toBe(1);
      expect(paymentsService.createPendingPayment).toHaveBeenCalledWith(
        'tenant-1',
        'booking-1',
        PaymentProvider.PAYME,
        'payme-tx-1',
        100000,
      );
    });
  });

  describe('PerformTransaction', () => {
    it('tranzaksiya topilmasa -31003 xato qaytaradi', async () => {
      paymentsService.findPaymentByTransaction.mockResolvedValue(null);

      const result: any = await service.handle({ method: 'PerformTransaction', params: { id: 'unknown' }, id: 3 }, authHeader);

      expect(result.error?.code).toBe(-31003);
    });

    it("PENDING tranzaksiyani bajaradi va state=2 qaytaradi", async () => {
      const payment = { id: 'payment-1', bookingId: 'booking-1', status: PaymentStatus.PENDING, updatedAt: new Date() };
      paymentsService.findPaymentByTransaction.mockResolvedValue(payment);
      paymentsService.findBookingWithTenant.mockResolvedValue(booking);
      paymentsService.markPaymentPaid.mockResolvedValue({ payment: { ...payment, status: PaymentStatus.PAID } });

      const result: any = await service.handle({ method: 'PerformTransaction', params: { id: 'payme-tx-1' }, id: 3 }, authHeader);

      expect(result.result.state).toBe(2);
      expect(paymentsService.markPaymentPaid).toHaveBeenCalledWith(payment);
    });
  });

  it("noma'lum method uchun -32601 qaytaradi", async () => {
    const result: any = await service.handle({ method: 'Unknown', params: {}, id: 5 }, authHeader);
    expect(result.error?.code).toBe(-32601);
  });
});
