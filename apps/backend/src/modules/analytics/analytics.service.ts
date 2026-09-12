import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, RoomType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { AnalyticsOverviewQueryDto } from './dto/analytics-overview-query.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_GRANULARITY_THRESHOLD_DAYS = 62;
const TOP_ROOMS_LIMIT = 5;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

interface BucketAccumulator {
  key: string;
  revenue: number;
  bookings: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bosh sahifa/Hisobotlar uchun asosiy analitika: daromad, bandlik,
   * RevPAR, ADR, vaqt bo'yicha tendensiya, PRIVATE/SHARED ulushi va
   * top xonalar — barchasi joriy tenant bo'yicha ajratilgan.
   *
   * Metodologiya (aniq va o'zi bilan izchil bo'lishi uchun qasddan
   * "unit" — PRIVATE xona = 1 unit, SHARED xona = totalBeds unit —
   * asosida hisoblanadi, shu bilan RevPAR = ADR x Occupancy% ayniyati
   * saqlanib qoladi):
   *  - availableUnits = barcha xonalarning totalBeds yig'indisi.
   *  - occupiedUnitNights = har bir bron uchun (bedsBooked x davr bilan
   *    kesishgan tunlar soni) yig'indisi.
   *  - Daromad har bir bronning umumiy narxidan davrga tushgan
   *    tunlarga proporsional ulush sifatida hisoblanadi (bir bron
   *    ikkita hisobot davri orasida bo'linsa, ikkisiga ham to'g'ri
   *    ulush tushishi uchun).
   *  - "Jami bronlar" — checkIn sanasi ushbu davr ichiga tushgan
   *    bronlar soni (vaqt qatoridagi kunlik/oylik bronlar yig'indisi
   *    aynan shu songa teng bo'ladi).
   */
  async getOverview(tenantId: string | null, query: AnalyticsOverviewQueryDto) {
    const resolvedTenantId = requireTenantId(tenantId);
    const { periodStart, periodEndExclusive, periodDays } = this.resolvePeriod(query);

    const [rooms, bookings] = await Promise.all([
      this.prisma.room.findMany({
        where: { tenantId: resolvedTenantId },
        select: { id: true, roomNumber: true, category: true, type: true, totalBeds: true },
      }),
      this.prisma.booking.findMany({
        where: {
          tenantId: resolvedTenantId,
          status: { not: BookingStatus.CANCELLED },
          checkIn: { lt: periodEndExclusive },
          checkOut: { gt: periodStart },
        },
        select: {
          id: true,
          roomId: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          bedsBooked: true,
          room: { select: { type: true, roomNumber: true, category: true } },
        },
      }),
    ]);

    const availableUnits = rooms.reduce((sum, room) => sum + room.totalBeds, 0);
    const granularity: 'day' | 'month' = periodDays > MONTH_GRANULARITY_THRESHOLD_DAYS ? 'month' : 'day';
    const buckets = this.initBuckets(periodStart, periodEndExclusive, granularity);

    let totalRevenue = 0;
    let totalBookings = 0;
    let occupiedUnitNights = 0;
    const revenueByRoomType: Record<RoomType, number> = { PRIVATE: 0, SHARED: 0 };
    const roomStats = new Map<string, { roomNumber: string; category: string; revenue: number; bookings: number }>();

    for (const booking of bookings) {
      const nightsTotal = Math.max(1, Math.round((booking.checkOut.getTime() - booking.checkIn.getTime()) / MS_PER_DAY));
      const clipStart = booking.checkIn > periodStart ? booking.checkIn : periodStart;
      const clipEndExclusive = booking.checkOut < periodEndExclusive ? booking.checkOut : periodEndExclusive;
      const clippedNights = Math.max(0, Math.round((clipEndExclusive.getTime() - clipStart.getTime()) / MS_PER_DAY));
      if (clippedNights === 0) continue;

      const revenuePerNight = Number(booking.totalPrice) / nightsTotal;
      const revenueShare = revenuePerNight * clippedNights;

      totalRevenue += revenueShare;
      occupiedUnitNights += booking.bedsBooked * clippedNights;
      revenueByRoomType[booking.room.type] += revenueShare;

      const roomEntry = roomStats.get(booking.roomId) ?? {
        roomNumber: booking.room.roomNumber,
        category: booking.room.category,
        revenue: 0,
        bookings: 0,
      };
      roomEntry.revenue += revenueShare;
      // "topRooms" uchun bronlar soni davrga QISMAN ham tushgan bronlarni
      // o'z ichiga oladi (checkIn'i davrdan oldin bo'lsa ham) — bu
      // "totalBookings" KPI'sidan (faqat checkIn davr ichida bo'lganlar)
      // qasddan farq qiladi: bu yerda "xona shu davrda qancha faol
      // bo'lgani" so'raladi, "nechta yangi bron boshlangani" emas.
      roomEntry.bookings += 1;
      roomStats.set(booking.roomId, roomEntry);

      for (let night = new Date(clipStart); night < clipEndExclusive; night = new Date(night.getTime() + MS_PER_DAY)) {
        const key = granularity === 'day' ? dayKey(night) : monthKey(night);
        const bucket = buckets.get(key);
        if (bucket) bucket.revenue += revenuePerNight;
      }

      if (booking.checkIn >= periodStart && booking.checkIn < periodEndExclusive) {
        totalBookings += 1;
        const startKey = granularity === 'day' ? dayKey(booking.checkIn) : monthKey(booking.checkIn);
        const startBucket = buckets.get(startKey);
        if (startBucket) startBucket.bookings += 1;
      }
    }

    const availableUnitNights = availableUnits * periodDays;
    const occupancyRate = availableUnitNights > 0 ? (occupiedUnitNights / availableUnitNights) * 100 : 0;
    const revPar = availableUnitNights > 0 ? totalRevenue / availableUnitNights : 0;
    const adr = occupiedUnitNights > 0 ? totalRevenue / occupiedUnitNights : 0;

    const roomTypeBreakdown = (Object.keys(revenueByRoomType) as RoomType[]).map((type) => ({
      type,
      revenue: round2(revenueByRoomType[type]),
      share: totalRevenue > 0 ? round2((revenueByRoomType[type] / totalRevenue) * 100) : 0,
    }));

    const topRooms = Array.from(roomStats.entries())
      .map(([roomId, stats]) => ({
        roomId,
        roomNumber: stats.roomNumber,
        category: stats.category,
        revenue: round2(stats.revenue),
        bookings: stats.bookings,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, TOP_ROOMS_LIMIT);

    return {
      range: { startDate: dayKey(periodStart), endDate: dayKey(new Date(periodEndExclusive.getTime() - MS_PER_DAY)) },
      granularity,
      kpis: {
        totalRevenue: round2(totalRevenue),
        occupancyRate: round2(occupancyRate),
        totalBookings,
        revPar: round2(revPar),
        adr: round2(adr),
      },
      timeSeries: Array.from(buckets.values()).map((bucket) => ({
        date: bucket.key,
        revenue: round2(bucket.revenue),
        bookings: bucket.bookings,
      })),
      roomTypeBreakdown,
      topRooms,
    };
  }

  private resolvePeriod(query: AnalyticsOverviewQueryDto) {
    const rawEnd = query.endDate ? new Date(query.endDate) : new Date();
    const rawStart = query.startDate ? new Date(query.startDate) : new Date(rawEnd.getTime() - 29 * MS_PER_DAY);

    const periodStart = startOfDay(rawStart);
    const periodEndExclusive = new Date(startOfDay(rawEnd).getTime() + MS_PER_DAY);

    if (periodStart >= periodEndExclusive) {
      throw new BadRequestException("startDate endDate dan oldin (yoki unga teng) bo'lishi kerak");
    }

    const periodDays = Math.round((periodEndExclusive.getTime() - periodStart.getTime()) / MS_PER_DAY);
    return { periodStart, periodEndExclusive, periodDays };
  }

  private initBuckets(periodStart: Date, periodEndExclusive: Date, granularity: 'day' | 'month'): Map<string, BucketAccumulator> {
    const buckets = new Map<string, BucketAccumulator>();

    if (granularity === 'day') {
      for (let day = new Date(periodStart); day < periodEndExclusive; day = new Date(day.getTime() + MS_PER_DAY)) {
        const key = dayKey(day);
        buckets.set(key, { key, revenue: 0, bookings: 0 });
      }
      return buckets;
    }

    const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const end = new Date(periodEndExclusive.getFullYear(), periodEndExclusive.getMonth(), 1);
    while (cursor <= end) {
      const key = monthKey(cursor);
      buckets.set(key, { key, revenue: 0, bookings: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }
}
