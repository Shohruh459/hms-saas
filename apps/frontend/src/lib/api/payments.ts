import { apiClient } from './client';
import type { Booking, PublicTenant } from './types';

/**
 * Click'ning hosted to'lov sahifasiga yo'naltirish havolasi. Bu yerda hech
 * qanday maxfiy kalit ishlatilmaydi — faqat ommaviy merchantId/serviceId
 * (tenants/public'dan) va bron ma'lumotlari. Imzoni Click serveri backend
 * bilan /payments/click/prepare orqali serverlar aro tekshiradi.
 */
export function buildClickCheckoutUrl(tenant: PublicTenant, booking: Booking, returnUrl: string): string | null {
  if (!tenant.payments.click) return null;
  const { merchantId, serviceId } = tenant.payments.click;
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: booking.totalPrice,
    transaction_param: booking.id,
    return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

/** Payme'ning hosted checkout havolasi (https://developer.help.paycom.uz). */
export function buildPaymeCheckoutUrl(tenant: PublicTenant, booking: Booking): string | null {
  if (!tenant.payments.payme) return null;
  const { merchantId } = tenant.payments.payme;
  const amountTiyin = Math.round(Number(booking.totalPrice) * 100);
  const raw = `m=${merchantId};ac.booking_id=${booking.id};a=${amountTiyin}`;
  const encoded = typeof window !== 'undefined' ? window.btoa(raw) : Buffer.from(raw).toString('base64');
  return `https://checkout.paycom.uz/${encoded}`;
}

export async function createStripeCheckoutSession(
  bookingId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>('/payments/stripe/checkout-session', {
    bookingId,
    successUrl,
    cancelUrl,
  });
  return data;
}
