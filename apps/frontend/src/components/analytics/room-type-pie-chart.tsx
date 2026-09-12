'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalyticsRoomTypeBreakdown, RoomType } from '../../lib/api/types';
import { useTranslations } from '../../lib/i18n-provider';

// Fixed, validated categorical order — PRIVATE always first (brand blue),
// SHARED always second (amber) — never reassigned by data order.
const TYPE_COLOR: Record<RoomType, string> = { PRIVATE: '#2563eb', SHARED: '#f59e0b' };

export function RoomTypePieChart({ data }: { data: AnalyticsRoomTypeBreakdown[] }) {
  const { t } = useTranslations();
  const hasRevenue = data.some((item) => item.revenue > 0);

  if (!hasRevenue) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        {t('analytics.noData')}
      </div>
    );
  }

  const chartData = data.map((item) => ({ ...item, name: t(`room.type_${item.type}`) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="revenue"
          nameKey="name"
          innerRadius={56}
          outerRadius={90}
          paddingAngle={2}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(entry: any) => (entry.share > 0 ? `${entry.share.toFixed(0)}%` : '')}
        >
          {chartData.map((entry) => (
            <Cell key={entry.type} fill={TYPE_COLOR[entry.type]} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={28} />
        <Tooltip
          formatter={(value, _name, item: { payload?: { name?: string } }) => [
            `${Math.round(Number(value)).toLocaleString()} so'm`,
            item.payload?.name ?? '',
          ]}
          contentStyle={{ borderRadius: 8, border: '1px solid hsl(214 32% 91%)', fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
