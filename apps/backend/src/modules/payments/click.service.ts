import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

const CLICK_ERROR = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
} as const;

/**
 * Click Merchant API (https://docs.click.uz) — Prepare/Complete oqimi.
 * Har bir mehmonxona (tenant) o'zining Click secretKey'iga ega bo'lgani
 * uchun tenant `merchant_trans_id` (= bookingId) orqali aniqlanadi.
 */
@Injectable()
export class ClickService {
  constructor(private readonly paymentsService: PaymentsService) {}

  async prepare(body: Record<string, any>) {
    const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = body;

    const booking = await this.paymentsService.findBookingWithTenant(merchant_trans_id);
    if (!booking) {
      return this.errorResponse(body, CLICK_ERROR.USER_NOT_FOUND, 'Booking topilmadi');
    }

    const secretKey = this.paymentsService.getPaymentKeys(booking.tenant).click?.secretKey;
    const signIsValid =
      !!secretKey &&
      this.verifySign([click_trans_id, service_id, secretKey, merchant_trans_id, amount, action, sign_time], sign_string);
    if (!signIsValid) {
      return this.errorResponse(body, CLICK_ERROR.SIGN_CHECK_FAILED, 'SIGN CHECK FAILED');
    }

    if (Number(amount) !== Number(booking.totalPrice)) {
      return this.errorResponse(body, CLICK_ERROR.INCORRECT_AMOUNT, 'Incorrect amount');
    }

    const existing = await this.paymentsService.findPaymentByTransaction(PaymentProvider.CLICK, String(click_trans_id));
    if (existing?.status === PaymentStatus.PAID) {
      return this.errorResponse(body, CLICK_ERROR.ALREADY_PAID, 'Already paid');
    }
    if (!existing) {
      await this.paymentsService.createPendingPayment(
        booking.tenantId,
        booking.id,
        PaymentProvider.CLICK,
        String(click_trans_id),
        Number(amount),
      );
    }

    return {
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: click_trans_id,
      error: CLICK_ERROR.SUCCESS,
      error_note: 'Success',
    };
  }

  async complete(body: Record<string, any>) {
    const { click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, action, sign_time, sign_string, error } = body;

    const payment = await this.paymentsService.findPaymentByTransaction(PaymentProvider.CLICK, String(click_trans_id));
    if (!payment) {
      return this.errorResponse(body, CLICK_ERROR.TRANSACTION_NOT_FOUND, 'Transaction not found');
    }

    const booking = await this.paymentsService.findBookingWithTenant(payment.bookingId);
    if (!booking) {
      return this.errorResponse(body, CLICK_ERROR.USER_NOT_FOUND, 'Booking topilmadi');
    }

    const secretKey = this.paymentsService.getPaymentKeys(booking.tenant).click?.secretKey;
    const signIsValid =
      !!secretKey &&
      this.verifySign(
        [click_trans_id, service_id, secretKey, merchant_trans_id, merchant_prepare_id, amount, action, sign_time],
        sign_string,
      );
    if (!signIsValid) {
      return this.errorResponse(body, CLICK_ERROR.SIGN_CHECK_FAILED, 'SIGN CHECK FAILED');
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: click_trans_id,
        error: CLICK_ERROR.SUCCESS,
        error_note: 'Already confirmed',
      };
    }

    if (Number(error) < 0) {
      await this.paymentsService.markPaymentFailed(payment);
      return { click_trans_id, merchant_trans_id, error: CLICK_ERROR.SUCCESS, error_note: 'Cancelled' };
    }

    await this.paymentsService.markPaymentPaid(payment);

    return {
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: click_trans_id,
      error: CLICK_ERROR.SUCCESS,
      error_note: 'Success',
    };
  }

  private verifySign(parts: unknown[], providedSign: string): boolean {
    if (!providedSign) return false;
    const expected = createHash('md5').update(parts.join('')).digest('hex');
    return expected === providedSign;
  }

  private errorResponse(body: Record<string, any>, error: number, error_note: string) {
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error,
      error_note,
    };
  }
}
