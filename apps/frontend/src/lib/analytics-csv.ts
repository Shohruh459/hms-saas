import type { AnalyticsOverview } from './api/types';

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsvRow(cells: Array<string | number>): string {
  return cells.map(escapeCsvCell).join(',');
}

export function buildAnalyticsCsv(overview: AnalyticsOverview): string {
  const lines: string[] = [];

  lines.push(toCsvRow(['Metric', 'Value']));
  lines.push(toCsvRow(['Total Revenue', overview.kpis.totalRevenue]));
  lines.push(toCsvRow(['Occupancy Rate (%)', overview.kpis.occupancyRate]));
  lines.push(toCsvRow(['Total Bookings', overview.kpis.totalBookings]));
  lines.push(toCsvRow(['RevPAR', overview.kpis.revPar]));
  lines.push(toCsvRow(['ADR', overview.kpis.adr]));
  lines.push('');

  lines.push(toCsvRow(['Date', 'Revenue', 'Bookings']));
  for (const point of overview.timeSeries) {
    lines.push(toCsvRow([point.date, point.revenue, point.bookings]));
  }
  lines.push('');

  lines.push(toCsvRow(['Room Type', 'Revenue', 'Share (%)']));
  for (const item of overview.roomTypeBreakdown) {
    lines.push(toCsvRow([item.type, item.revenue, item.share]));
  }
  lines.push('');

  lines.push(toCsvRow(['Room Number', 'Category', 'Revenue', 'Bookings']));
  for (const room of overview.topRooms) {
    lines.push(toCsvRow([room.roomNumber, room.category, room.revenue, room.bookings]));
  }

  return lines.join('\n');
}

/** CSV faylni brauzer orqali yuklab olishni ishga tushiradi (Excel bilan mos UTF-8 BOM bilan). */
export function downloadAnalyticsCsv(overview: AnalyticsOverview) {
  const csv = `﻿${buildAnalyticsCsv(overview)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-${overview.range.startDate}_${overview.range.endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
