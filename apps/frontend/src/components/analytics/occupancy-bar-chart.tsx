'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsTimeSeriesPoint } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';
import { formatAxisDate } from '../../lib/analytics-format';

const BOOKINGS_COLOR = '#2563eb';

export function OccupancyBarChart({
  data,
  granularity,
}: {
  data: AnalyticsTimeSeriesPoint[];
  granularity: 'day' | 'month';
}) {
  const { t } = useTranslations();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => formatAxisDate(value, granularity)}
          tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
          axisLine={{ stroke: 'hsl(214 32% 91%)' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          formatter={(value) => [Number(value), t('analytics.bookingsCount')]}
          labelFormatter={(label) => formatAxisDate(String(label), granularity)}
          contentStyle={{ borderRadius: 8, border: '1px solid hsl(214 32% 91%)', fontSize: 12 }}
        />
        <Bar dataKey="bookings" fill={BOOKINGS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
