import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import Stripe from 'stripe';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

/**
 * Stripe webhook (https://stripe.com/docs/webhooks/signatures). Tenant
 * PaymentIntent/CheckoutSession yaratilganda `metadata.bookingId`
 * o'rnatilgan bo'lishi kutiladi — shu orqali tenant va uning
 * webhookSecret'i aniqlanadi, so'ng HMAC-SHA256 imzosi tekshiriladi.
 */
@Injectable()
export class StripeService {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Mehmon frontend'dan bron uchun to'lov boshlaganda chaqiriladi.
   * Stripe Checkout Session yaratiladi va uning hosted `url`'i qaytariladi
   * — brauzer to'g'ridan-to'g'ri shu sahifaga yo'naltiriladi (real Stripe
   * integratsiyasidagi standart oqim, valyuta demo uchun USD).
   */
  async createCheckoutSession(bookingId: string, guestId: string, successUrl: string, cancelUrl: string) {
    const booking = await this.paymentsService.findBookingWithTenant(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking topilmadi');
    }
    if (booking.guestId !== guestId) {
      throw new ForbiddenException("Faqat o'zingizning bronlaringiz uchun to'lov qila olasiz");
    }

    const secretKey = this.paymentsService.getPaymentKeys(booking.tenant).stripe?.secretKey;
    if (!secretKey) {
      throw new BadRequestException('Ushbu mehmonxona uchun Stripe sozlanmagan');
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Booking ${booking.id}` },
            unit_amount: Math.round(Number(booking.totalPrice) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { bookingId: booking.id },
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined, event: any) {
    const bookingId = event?.data?.object?.metadata?.bookingId;
    if (!bookingId) {
      throw new BadRequestException("Stripe webhook: metadata.bookingId topilmadi");
    }

    const booking = await this.paymentsService.findBookingWithTenant(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking topilmadi');
    }

    const webhookSecret = this.paymentsService.getPaymentKeys(booking.tenant).stripe?.webhookSecret;
    if (!webhookSecret || !this.verifySignature(rawBody, signatureHeader, webhookSecret)) {
      throw new BadRequestException("Stripe imzosi noto'g'ri");
    }

    if (event.type !== 'payment_intent.succeeded' && event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const stripeObject = event.data.object;
    const transactionId = String(stripeObject.id);
    const amount = Number(stripeObject.amount_received ?? stripeObject.amount_total ?? 0) / 100;

    let payment = await this.paymentsService.findPaymentByTransaction(PaymentProvider.STRIPE, transactionId);
    if (!payment) {
      payment = await this.paymentsService.createPendingPayment(
        booking.tenantId,
        booking.id,
        PaymentProvider.STRIPE,
        transactionId,
        amount,
      );
    }

    if (payment.status !== PaymentStatus.PAID) {
      await this.paymentsService.markPaymentPaid(payment);
    }

    return { received: true };
  }

  private verifySignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
    if (!signatureHeader) return false;

    const parts = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=') as [string, string]));
    const timestamp = parts.t;
    const providedSignature = parts.v1;
    if (!timestamp || !providedSignature) return false;

    const signedPayload = `${timestamp}.${rawBody.toString('utf-8')}`;
    const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');

    if (expectedSignature.length !== providedSignature.length) return false;
    return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
  }
}
