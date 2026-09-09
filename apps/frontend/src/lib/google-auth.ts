const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Backend'ning Google OAuth boshlash yo'li — oddiy <a href> orqali to'liq sahifa navigatsiyasi kerak (fetch/axios emas). */
export function getGoogleAuthUrl(): string {
  return `${API_URL}/auth/google`;
}
