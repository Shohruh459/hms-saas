'use client';

import { BedDouble, CalendarCheck, Download, Percent, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DateRangeFilter, resolvePresetRange, type DateRangePreset } from '../../../../components/analytics/date-range-filter';
import { KpiCard, computeTrend } from '../../../../components/analytics/kpi-card';
import { OccupancyBarChart } from '../../../../components/analytics/occupancy-bar-chart';
import { RevenueAreaChart } from '../../../../components/analytics/revenue-area-chart';
import { RoomTypePieChart } from '../../../../components/analytics/room-type-pie-chart';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { fetchAnalyticsOverview } from '../../../../lib/api/analytics';
import type { AnalyticsOverview } from '../../../../lib/api/types';
import { useAuth } from '../../../../lib/auth-context';
import { downloadAnalyticsCsv } from '../../../../lib/analytics-csv';
import { previousPeriodRange } from '../../../../lib/analytics-format';
import { useTranslations } from '../../../../lib/i18n-provider';

function isForbidden(error: unknown): boolean {
  return Boolean((error as { response?: { status?: number } })?.response?.status === 403);
}

export default function AnalyticsPage() {
  const { t, locale } = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [preset, setPreset] = useState<DateRangePreset>('last30');
  const initialRange = useMemo(() => resolvePresetRange('last30'), []);
  const [range, setRange] = useState(initialRange);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [previousOverview, setPreviousOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const canView = user?.role === 'HOTEL_OWNER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (authLoading) return;
    if (user && !canView) {
      router.push(`/${locale}/admin/dashboard`);
    }
  }, [authLoading, user, canView, locale, router]);

  useEffect(() => {
    if (authLoading || !canView) return;

    let cancelled = false;
    setLoading(true);
    setAccessDenied(false);

    const previous = previousPeriodRange(range.startDate, range.endDate);

    Promise.all([fetchAnalyticsOverview(range), fetchAnalyticsOverview(previous)])
      .then(([current, prev]) => {
        if (cancelled) return;
        setOverview(current);
        setPreviousOverview(prev);
      })
      .catch((error) => {
        if (cancelled) return;
        if (isForbidden(error)) setAccessDenied(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, canView, range]);

  function handlePresetChange(next: DateRangePreset) {
    setPreset(next);
    if (next !== 'custom') {
      setRange(resolvePresetRange(next));
    }
  }

  function handleCustomRangeChange(startDate: string, endDate: string) {
    if (startDate && endDate) {
      setRange({ startDate, endDate });
    }
  }

  if (authLoading || !user) return null;

  if (!canView) {
    return <p className="py-8 text-center text-muted-foreground">{t('analytics.accessDenied')}</p>;
  }

  if (accessDenied) {
    return <p className="py-8 text-center text-muted-foreground">{t('analytics.accessDenied')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
        <Button
          size="sm"
          variant="outline"
          disabled={!overview}
          onClick={() => overview && downloadAnalyticsCsv(overview)}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" /> {t('analytics.exportCsv')}
        </Button>
      </div>

      <DateRangeFilter
        preset={preset}
        customStart={preset === 'custom' ? range.startDate : ''}
        customEnd={preset === 'custom' ? range.endDate : ''}
        onPresetChange={handlePresetChange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      {loading || !overview ? (
        <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Wallet}
              label={t('analytics.totalRevenue')}
              value={`${Math.round(overview.kpis.totalRevenue).toLocaleString()} so'm`}
              trendPercent={
                previousOverview ? computeTrend(overview.kpis.totalRevenue, previousOverview.kpis.totalRevenue) : undefined
              }
            />
            <KpiCard
              icon={Percent}
              label={t('analytics.occupancyRate')}
              value={`${overview.kpis.occupancyRate.toFixed(1)}%`}
              trendPercent={
                previousOverview ? computeTrend(overview.kpis.occupancyRate, previousOverview.kpis.occupancyRate) : undefined
              }
            />
            <KpiCard
              icon={CalendarCheck}
              label={t('analytics.totalBookings')}
              value={`${overview.kpis.totalBookings}`}
              trendPercent={
                previousOverview ? computeTrend(overview.kpis.totalBookings, previousOverview.kpis.totalBookings) : undefined
              }
            />
            <KpiCard
              icon={BedDouble}
              label={t('analytics.revPar')}
              value={`${Math.round(overview.kpis.revPar).toLocaleString()} so'm`}
              trendPercent={previousOverview ? computeTrend(overview.kpis.revPar, previousOverview.kpis.revPar) : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.revenueTrend')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueAreaChart data={overview.timeSeries} granularity={overview.granularity} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.roomTypeSplit')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RoomTypePieChart data={overview.roomTypeBreakdown} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('analytics.occupancyTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <OccupancyBarChart data={overview.timeSeries} granularity={overview.granularity} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('analytics.topRooms')}</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.topRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('analytics.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">{t('admin.roomNumberLabel')}</th>
                        <th className="py-2 pr-4">{t('admin.categoryLabel')}</th>
                        <th className="py-2 pr-4">{t('analytics.revenue')}</th>
                        <th className="py-2">{t('analytics.bookingsCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.topRooms.map((room) => (
                        <tr key={room.roomId} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{room.roomNumber}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{room.category}</td>
                          <td className="py-2 pr-4">{Math.round(room.revenue).toLocaleString()} so'm</td>
                          <td className="py-2">{room.bookings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
