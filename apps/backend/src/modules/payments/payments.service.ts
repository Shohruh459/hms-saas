import { Injectable } from '@nestjs/common';
import { BookingStatus, Payment, PaymentProvider, PaymentStatus, Tenant } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPaymentKeys } from './types/tenant-payment-keys.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findBookingWithTenant(bookingId: string) {
    return this.prisma.booking.findUnique({ where: { id: bookingId }, include: { tenant: true } });
  }

  getPaymentKeys(tenant: Tenant): TenantPaymentKeys {
    return (tenant.paymentKeys as TenantPaymentKeys | null) ?? {};
  }

  findPaymentByTransaction(provider: PaymentProvider, transactionId: string) {
    return this.prisma.payment.findUnique({ where: { provider_transactionId: { provider, transactionId } } });
  }

  findActivePendingPaymentForBooking(bookingId: string, provider: PaymentProvider) {
    return this.prisma.payment.findFirst({ where: { bookingId, provider, status: PaymentStatus.PENDING } });
  }

  createPendingPayment(tenantId: string, bookingId: string, provider: PaymentProvider, transactionId: string, amount: number) {
    return this.prisma.payment.create({
      data: { tenantId, bookingId, provider, transactionId, amount, status: PaymentStatus.PENDING },
    });
  }

  async markPaymentPaid(payment: Payment) {
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PAID },
    });

    // To'lov qabul qilinganda bron avtomatik tasdiqlanadi (PENDING -> CONFIRMED).
    const booking = await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: PaymentStatus.PAID, status: BookingStatus.CONFIRMED },
    });

    this.notifications.notifyAdmins(payment.tenantId, 'booking.paid', booking);
    this.notifications.notifyUser(booking.guestId, 'booking.paid', booking);

    return { payment: updatedPayment, booking };
  }

  markPaymentFailed(payment: Payment) {
    return this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
  }

  async markPaymentRefunded(payment: Payment) {
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });

    this.notifications.notifyAdmins(payment.tenantId, 'booking.refunded', updated);

    return updated;
  }
}
