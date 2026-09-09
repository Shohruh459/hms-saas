/**
 * Superadmin panelining "ildiz" (root) egasi — doim, hech qachon bekor
 * qilib bo'lmaydigan tarzda, superadmin huquqiga ega. Faqat shu pochta
 * boshqa pochtalarga ruxsat bera oladi (AllowedSuperadminEmail orqali).
 */
export const ROOT_SUPER_ADMIN_EMAIL = 'shohruhluqmonov13@gmail.com';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isRootSuperAdminEmail(email: string): boolean {
  return normalizeEmail(email) === ROOT_SUPER_ADMIN_EMAIL;
}
