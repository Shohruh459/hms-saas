'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsTimeSeriesPoint } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { formatAxisDate, formatCompactNumber } from '../../lib/analytics-format';

const REVENUE_COLOR = '#2563eb';

export function RevenueAreaChart({
  data,
  granularity,
}: {
  data: AnalyticsTimeSeriesPoint[];
  granularity: 'day' | 'month';
}) {
  const { t } = useTranslations();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.28} />
            <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => formatAxisDate(value, granularity)}
          tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
          axisLine={{ stroke: 'hsl(214 32% 91%)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => formatCompactNumber(value)}
          tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value) => [`${Math.round(Number(value)).toLocaleString()} so'm`, t('analytics.revenue')]}
          labelFormatter={(label) => formatAxisDate(String(label), granularity)}
          contentStyle={{ borderRadius: 8, border: '1px solid hsl(214 32% 91%)', fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={REVENUE_COLOR}
          strokeWidth={2}
          fill="url(#analyticsRevenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
