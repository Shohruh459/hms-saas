import { apiClient } from './client';
import type { AnalyticsOverview } from './types';

export interface AnalyticsOverviewParams {
  startDate?: string;
  endDate?: string;
}

export async function fetchAnalyticsOverview(params: AnalyticsOverviewParams = {}): Promise<AnalyticsOverview> {
  const { data } = await apiClient.get<AnalyticsOverview>('/admin/analytics/overview', {
    params: { startDate: params.startDate, endDate: params.endDate },
  });
  return data;
}
