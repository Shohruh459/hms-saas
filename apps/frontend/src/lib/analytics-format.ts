const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Date -> "yyyy-MM-dd" (mahalliy kalendar kuni, UTC siljishisiz). */
export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Joriy davr bilan bir xil uzunlikdagi, undan bevosita oldingi davrni
 * qaytaradi — KPI kartochkalaridagi o'sish/pasayish foizini hisoblash
 * uchun ("oldingi davr" solishtiruv nuqtasi).
 */
export function previousPeriodRange(startDate: string, endDate: string): { startDate: string; endDate: string } {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  const prevEnd = new Date(start.getTime() - MS_PER_DAY);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * MS_PER_DAY);
  return { startDate: toDateStr(prevStart), endDate: toDateStr(prevEnd) };
}

/** Grafik X o'qi uchun sana formatlash: kunlik -> "dd.MM", oylik -> "MM.yyyy". */
export function formatAxisDate(value: string, granularity: 'day' | 'month'): string {
  if (granularity === 'month') {
    const [year, month] = value.split('-');
    return `${month}.${year}`;
  }
  const [, month, day] = value.split('-');
  return `${day}.${month}`;
}

/** Katta sonlarni grafik o'qlarida ixcham ko'rsatish (1200000 -> "1.2M"). */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}
