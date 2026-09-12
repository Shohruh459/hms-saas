'use client';

import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

/**
 * O'sish/pasayish foizini joriy va oldingi (teng uzunlikdagi) davr
 * qiymatlari asosida hisoblaydi. Oldingi davr qiymati 0 bo'lsa, foiz
 * aniqlanmaydi (undefined) — ko'rsatkichsiz qoladi.
 */
export function computeTrend(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  trendPercent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trendPercent?: number;
}) {
  const isUp = trendPercent !== undefined && trendPercent >= 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trendPercent !== undefined && (
          <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', isUp ? 'text-emerald-600' : 'text-red-600')}>
            {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(trendPercent).toFixed(1)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
