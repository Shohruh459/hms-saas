/**
 * Tenant.paymentKeys (Json) ustunining shakli. Har bir mehmonxona o'z
 * to'lov provayderlari uchun mustaqil credentiallarga ega bo'ladi.
 */
export interface TenantPaymentKeys {
  click?: {
    merchantId: string;
    serviceId: string;
    secretKey: string;
  };
  payme?: {
    merchantId: string;
    secretKey: string;
  };
  stripe?: {
    secretKey?: string;
    webhookSecret: string;
  };
}
