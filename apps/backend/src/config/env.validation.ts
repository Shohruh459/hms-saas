const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;

/**
 * ConfigModule.forRoot({ validate }) uchun — muhim environment
 * o'zgaruvchilari yo'q bo'lsa, ilova jimgina zaif standart qiymat
 * (masalan "dev-secret") bilan ishga tushmasin, aksincha darhol
 * to'xtasin.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_VARS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Majburiy environment o'zgaruvchilari o'rnatilmagan: ${missing.join(', ')}`);
  }
  return config;
}
