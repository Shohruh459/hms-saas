import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

const createMock = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: createMock } },
  }));
});

describe('StripeService.createCheckoutSession', () => {
  const tenant = { id: 'tenant-1', paymentKeys: { stripe: { secretKey: 'sk_test_123' } } };
  const booking = { id: 'booking-1', guestId: 'guest-1', totalPrice: 100, tenant };

  let paymentsService: { findBookingWithTenant: jest.Mock; getPaymentKeys: jest.Mock };
  let service: StripeService;

  beforeEach(() => {
    createMock.mockReset();
    paymentsService = {
      findBookingWithTenant: jest.fn(),
      getPaymentKeys: jest.fn((t) => t.paymentKeys ?? {}),
    };
    service = new StripeService(paymentsService as unknown as PaymentsService);
  });

  it('booking topilmasa NotFoundException tashlaydi', async () => {
    paymentsService.findBookingWithTenant.mockResolvedValue(null);

    await expect(service.createCheckoutSession('booking-1', 'guest-1', 'https://x/success', 'https://x/cancel')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("boshqa mehmonning bronidan foydalanishga urinsa ForbiddenException tashlaydi", async () => {
    paymentsService.findBookingWithTenant.mockResolvedValue(booking);

    await expect(
      service.createCheckoutSession('booking-1', 'other-guest', 'https://x/success', 'https://x/cancel'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("to'g'ri chaqiruvda Stripe session yaratadi va url qaytaradi", async () => {
    paymentsService.findBookingWithTenant.mockResolvedValue(booking);
    createMock.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' });

    const result = await service.createCheckoutSession('booking-1', 'guest-1', 'https://x/success', 'https://x/cancel');

    expect(result.url).toBe('https://checkout.stripe.com/session_123');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        success_url: 'https://x/success',
        cancel_url: 'https://x/cancel',
        metadata: { bookingId: 'booking-1' },
      }),
    );
  });
});
