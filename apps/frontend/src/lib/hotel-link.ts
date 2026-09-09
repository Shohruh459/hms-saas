/**
 * Har bir mehmonxona o'z subdomeni ostida joylashadi. NEXT_PUBLIC_ROOT_DOMAIN
 * o'rnatilmagan bo'lsa (masalan lokal demo), ochiq havola qurib bo'lmaydi —
 * chaqiruvchi tomon buni tushuntirish xabari bilan almashtiradi.
 */
export function getHotelBookingUrl(subdomain: string): string | null {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!rootDomain) return null;
  return `https://${subdomain}.${rootDomain}`;
}
