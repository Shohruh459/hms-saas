import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, Tenant } from '@prisma/client';
import { PaymentsService } from './payments.service';

const PAYME_ERROR = {
  INSUFFICIENT_PRIVILEGE: -32504,
  METHOD_NOT_FOUND: -32601,
  INCORRECT_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  CANNOT_PERFORM_OPERATION: -31008,
  BOOKING_NOT_FOUND: -31050,
} as const;

const PAYME_STATE = {
  CREATED: 1,
  COMPLETED: 2,
  CANCELLED_PENDING: -1,
  CANCELLED_AFTER_COMPLETE: -2,
} as const;

class PaymeRpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

interface PaymeRequest {
  method: string;
  params: Record<string, any>;
  id: number | string;
}

/**
 * Payme JSON-RPC 2.0 protokoli (https://developer.help.paycom.uz).
 * Tenant `params.account.booking_id` (Create/CheckPerform) yoki avval
 * yaratilgan tranzaksiya orqali (Perform/Cancel/Check) aniqlanadi, so'ng
 * shu tenant'ning Payme secretKey'i bilan Basic Auth tekshiriladi.
 * Pul birligi — tiyin (1 UZS = 100 tiyin).
 */
@Injectable()
export class PaymeService {
  constructor(private readonly paymentsService: PaymentsService) {}

  async handle(request: PaymeRequest, authorizationHeader?: string) {
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'CheckPerformTransaction':
          return this.reply(id, await this.checkPerformTransaction(params, authorizationHeader));
        case 'CreateTransaction':
          return this.reply(id, await this.createTransaction(params, authorizationHeader));
        case 'PerformTransaction':
          return this.reply(id, await this.performTransaction(params, authorizationHeader));
        case 'CancelTransaction':
          return this.reply(id, await this.cancelTransaction(params, authorizationHeader));
        case 'CheckTransaction':
          return this.reply(id, await this.checkTransaction(params, authorizationHeader));
        default:
          return this.replyError(id, PAYME_ERROR.METHOD_NOT_FOUND, 'Method not found');
      }
    } catch (error) {
      if (error instanceof PaymeRpcError) {
        return this.replyError(id, error.code, error.message);
      }
      throw error;
    }
  }

  private async checkPerformTransaction(params: Record<string, any>, authHeader?: string) {
    const booking = await this.resolveBookingByAccount(params);
    this.assertAuthorized(authHeader, this.getPaymeSecret(booking));
    this.assertAmountMatches(booking, params.amount);

    return { allow: true };
  }

  private async createTransaction(params: Record<string, any>, authHeader?: string) {
    const booking = await this.resolveBookingByAccount(params);
    this.assertAuthorized(authHeader, this.getPaymeSecret(booking));
    this.assertAmountMatches(booking, params.amount);

    const transactionId = String(params.id);
    const existing = await this.paymentsService.findPaymentByTransaction(PaymentProvider.PAYME, transactionId);
    if (existing) {
      if (existing.status === PaymentStatus.FAILED || existing.status === PaymentStatus.REFUNDED) {
        throw new PaymeRpcError(PAYME_ERROR.CANNOT_PERFORM_OPERATION, "Tranzaksiya bekor qilingan, qayta yaratib bo'lmaydi");
      }
      return {
        create_time: existing.createdAt.getTime(),
        transaction: existing.id,
        state: existing.status === PaymentStatus.PAID ? PAYME_STATE.COMPLETED : PAYME_STATE.CREATED,
      };
    }

    const activePending = await this.paymentsService.findActivePendingPaymentForBooking(booking.id, PaymentProvider.PAYME);
    if (activePending) {
      throw new PaymeRpcError(PAYME_ERROR.CANNOT_PERFORM_OPERATION, 'Ushbu bron uchun boshqa faol tranzaksiya mavjud');
    }

    const created = await this.paymentsService.createPendingPayment(
      booking.tenantId,
      booking.id,
      PaymentProvider.PAYME,
      transactionId,
      Number(params.amount) / 100,
    );

    return { create_time: created.createdAt.getTime(), transaction: created.id, state: PAYME_STATE.CREATED };
  }

  private async performTransaction(params: Record<string, any>, authHeader?: string) {
    const payment = await this.requirePayment(params.id);
    const booking = await this.paymentsService.findBookingWithTenant(payment.bookingId);
    this.assertAuthorized(authHeader, booking ? this.getPaymeSecret(booking) : undefined);

    if (payment.status === PaymentStatus.PAID) {
      return { transaction: payment.id, perform_time: payment.updatedAt.getTime(), state: PAYME_STATE.COMPLETED };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new PaymeRpcError(PAYME_ERROR.CANNOT_PERFORM_OPERATION, "Tranzaksiyani bajarib bo'lmaydi");
    }

    const { payment: updated } = await this.paymentsService.markPaymentPaid(payment);

    return { transaction: updated.id, perform_time: updated.updatedAt.getTime(), state: PAYME_STATE.COMPLETED };
  }

  private async cancelTransaction(params: Record<string, any>, authHeader?: string) {
    const payment = await this.requirePayment(params.id);
    const booking = await this.paymentsService.findBookingWithTenant(payment.bookingId);
    this.assertAuthorized(authHeader, booking ? this.getPaymeSecret(booking) : undefined);

    if (payment.status === PaymentStatus.PENDING) {
      const updated = await this.paymentsService.markPaymentFailed(payment);
      return { transaction: updated.id, cancel_time: updated.updatedAt.getTime(), state: PAYME_STATE.CANCELLED_PENDING };
    }
    if (payment.status === PaymentStatus.PAID) {
      const updated = await this.paymentsService.markPaymentRefunded(payment);
      return { transaction: updated.id, cancel_time: updated.updatedAt.getTime(), state: PAYME_STATE.CANCELLED_AFTER_COMPLETE };
    }

    const state = payment.status === PaymentStatus.FAILED ? PAYME_STATE.CANCELLED_PENDING : PAYME_STATE.CANCELLED_AFTER_COMPLETE;
    return { transaction: payment.id, cancel_time: payment.updatedAt.getTime(), state };
  }

  private async checkTransaction(params: Record<string, any>, authHeader?: string) {
    const payment = await this.requirePayment(params.id);
    const booking = await this.paymentsService.findBookingWithTenant(payment.bookingId);
    this.assertAuthorized(authHeader, booking ? this.getPaymeSecret(booking) : undefined);

    const stateMap: Record<string, number> = {
      [PaymentStatus.PENDING]: PAYME_STATE.CREATED,
      [PaymentStatus.PAID]: PAYME_STATE.COMPLETED,
      [PaymentStatus.FAILED]: PAYME_STATE.CANCELLED_PENDING,
      [PaymentStatus.REFUNDED]: PAYME_STATE.CANCELLED_AFTER_COMPLETE,
    };
    const isPerformed = payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.REFUNDED;
    const isCancelled = payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.REFUNDED;

    return {
      create_time: payment.createdAt.getTime(),
      perform_time: isPerformed ? payment.updatedAt.getTime() : 0,
      cancel_time: isCancelled ? payment.updatedAt.getTime() : 0,
      transaction: payment.id,
      state: stateMap[payment.status],
      reason: null,
    };
  }

  private async resolveBookingByAccount(params: Record<string, any>) {
    const bookingId = params?.account?.booking_id;
    const booking = bookingId ? await this.paymentsService.findBookingWithTenant(bookingId) : null;
    if (!booking) {
      throw new PaymeRpcError(PAYME_ERROR.BOOKING_NOT_FOUND, 'Booking topilmadi');
    }
    return booking;
  }

  private async requirePayment(transactionId: unknown) {
    const payment = await this.paymentsService.findPaymentByTransaction(PaymentProvider.PAYME, String(transactionId));
    if (!payment) {
      throw new PaymeRpcError(PAYME_ERROR.TRANSACTION_NOT_FOUND, 'Transaction not found');
    }
    return payment;
  }

  private getPaymeSecret(booking: { tenant: Tenant }): string | undefined {
    return this.paymentsService.getPaymentKeys(booking.tenant).payme?.secretKey;
  }

  private assertAmountMatches(booking: { totalPrice: unknown }, amount: unknown) {
    if (Math.round(Number(booking.totalPrice) * 100) !== Number(amount)) {
      throw new PaymeRpcError(PAYME_ERROR.INCORRECT_AMOUNT, 'Incorrect amount');
    }
  }

  private assertAuthorized(authorizationHeader: string | undefined, expectedSecret: string | undefined) {
    const prefix = 'Basic ';
    if (!expectedSecret || !authorizationHeader?.startsWith(prefix)) {
      throw new PaymeRpcError(PAYME_ERROR.INSUFFICIENT_PRIVILEGE, 'Insufficient privilege');
    }

    const decoded = Buffer.from(authorizationHeader.slice(prefix.length), 'base64').toString('utf-8');
    const [login, password] = decoded.split(':');
    if (login !== 'Paycom' || password !== expectedSecret) {
      throw new PaymeRpcError(PAYME_ERROR.INSUFFICIENT_PRIVILEGE, 'Insufficient privilege');
    }
  }

  private reply(id: number | string, result: unknown) {
    return { jsonrpc: '2.0', id, result };
  }

  private replyError(id: number | string, code: number, message: string) {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}
