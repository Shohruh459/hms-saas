import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnalyticsService', () => {
  let prisma: { room: { findMany: jest.Mock }; booking: { findMany: jest.Mock } };
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = { room: { findMany: jest.fn() }, booking: { findMany: jest.fn() } };
    service = new AnalyticsService(prisma as unknown as PrismaService);
  });

  it("tenant konteksti bo'lmasa xato tashlaydi", async () => {
    await expect(service.getOverview(null, {})).rejects.toThrow();
  });

  it('startDate endDate dan keyin bo\'lsa -> BadRequestException', async () => {
    await expect(
      service.getOverview('t1', { startDate: '2026-01-10', endDate: '2026-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("xona/bron bo'lmasa hammasi nol qaytaradi (0'ga bo'lish yo'q)", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOverview('t1', { startDate: '2026-01-01', endDate: '2026-01-10' });

    expect(result.kpis).toEqual({ totalRevenue: 0, occupancyRate: 0, totalBookings: 0, revPar: 0, adr: 0 });
    expect(result.roomTypeBreakdown).toEqual([
      { type: 'PRIVATE', revenue: 0, share: 0 },
      { type: 'SHARED', revenue: 0, share: 0 },
    ]);
    expect(result.topRooms).toEqual([]);
    expect(result.timeSeries).toHaveLength(10);
  });

  it("PRIVATE va SHARED xonalar uchun daromad/bandlik/RevPAR/ADR to'g'ri hisoblanadi (qisman kesishgan bron bilan)", async () => {
    prisma.room.findMany.mockResolvedValue([
      { id: 'r1', roomNumber: '101', category: 'Standard', type: 'PRIVATE', totalBeds: 1 },
      { id: 'r2', roomNumber: 'S-1', category: 'Hostel', type: 'SHARED', totalBeds: 4 },
    ]);
    prisma.booking.findMany.mockResolvedValue([
      // To'liq davr ichida: 2026-01-02 -> 2026-01-05 (3 tun), 300000 so'm.
      {
        id: 'b1',
        roomId: 'r1',
        checkIn: new Date('2026-01-02T00:00:00.000Z'),
        checkOut: new Date('2026-01-05T00:00:00.000Z'),
        totalPrice: 300000,
        bedsBooked: 1,
        room: { type: 'PRIVATE', roomNumber: '101', category: 'Standard' },
      },
      // Davr boshidan oldin boshlangan (2025-12-30), davr ichiga faqat
      // 01-01 va 01-02 tunlari kesishadi -> 4 tundan 2 tasi hisobga olinadi.
      {
        id: 'b2',
        roomId: 'r2',
        checkIn: new Date('2025-12-30T00:00:00.000Z'),
        checkOut: new Date('2026-01-03T00:00:00.000Z'),
        totalPrice: 400000,
        bedsBooked: 2,
        room: { type: 'SHARED', roomNumber: 'S-1', category: 'Hostel' },
      },
    ]);

    const result = await service.getOverview('t1', { startDate: '2026-01-01', endDate: '2026-01-10' });

    // availableUnits = 1 (PRIVATE) + 4 (SHARED) = 5; periodDays = 10 -> 50 unit-tun.
    // occupiedUnitNights = 1*3 (b1) + 2*2 (b2, kesilgan) = 7.
    expect(result.kpis.totalRevenue).toBe(500000); // 300000 + (400000/4*2=200000)
    expect(result.kpis.occupancyRate).toBe(14); // 7/50*100
    expect(result.kpis.revPar).toBe(10000); // 500000/50
    expect(result.kpis.adr).toBeCloseTo(500000 / 7, 2);
    // b2'ning checkIn'i davrdan oldin -> "Jami bronlar"ga kirmaydi, faqat b1 kiradi.
    expect(result.kpis.totalBookings).toBe(1);

    // RevPAR = ADR x Occupancy% ayniyati saqlanishi kerak.
    expect(result.kpis.revPar).toBeCloseTo((result.kpis.adr * result.kpis.occupancyRate) / 100, 1);

    expect(result.roomTypeBreakdown).toEqual([
      { type: 'PRIVATE', revenue: 300000, share: 60 },
      { type: 'SHARED', revenue: 200000, share: 40 },
    ]);

    expect(result.topRooms).toEqual([
      { roomId: 'r1', roomNumber: '101', category: 'Standard', revenue: 300000, bookings: 1 },
      { roomId: 'r2', roomNumber: 'S-1', category: 'Hostel', revenue: 200000, bookings: 1 },
    ]);

    const jan1 = result.timeSeries.find((point) => point.date === '2026-01-01');
    const jan2 = result.timeSeries.find((point) => point.date === '2026-01-02');
    const jan4 = result.timeSeries.find((point) => point.date === '2026-01-04');
    expect(jan1?.revenue).toBe(100000); // faqat b2 (SHARED)ning bir kunlik ulushi
    expect(jan2?.revenue).toBe(200000); // b1 (100000) + b2 (100000)
    expect(jan2?.bookings).toBe(1); // b1 aynan shu kuni checkIn qilgan
    expect(jan4?.revenue).toBe(100000); // faqat b1
  });

  it("davr 62 kundan uzun bo'lsa oylik granularity ishlatadi", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await service.getOverview('t1', { startDate: '2026-01-01', endDate: '2026-04-01' });

    expect(result.granularity).toBe('month');
    expect(result.timeSeries.map((point) => point.date)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
  });

  it('sanalar berilmasa oxirgi 30 kunni ishlatadi', async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    const result = await service.getOverview('t1', {});
    jest.useRealTimers();

    expect(result.range.endDate).toBe('2026-06-15');
    expect(result.timeSeries).toHaveLength(30);
  });

  it("top xonalar ro'yxati daromad bo'yicha kamayish tartibida va 5 tadan oshmaydi", async () => {
    const rooms = Array.from({ length: 7 }, (_, i) => ({
      id: `r${i}`,
      roomNumber: `${100 + i}`,
      category: 'Standard',
      type: 'PRIVATE' as const,
      totalBeds: 1,
    }));
    prisma.room.findMany.mockResolvedValue(rooms);
    prisma.booking.findMany.mockResolvedValue(
      rooms.map((room, i) => ({
        id: `b${i}`,
        roomId: room.id,
        checkIn: new Date('2026-01-02T00:00:00.000Z'),
        checkOut: new Date('2026-01-03T00:00:00.000Z'),
        totalPrice: (i + 1) * 10000,
        bedsBooked: 1,
        room: { type: 'PRIVATE', roomNumber: room.roomNumber, category: 'Standard' },
      })),
    );

    const result = await service.getOverview('t1', { startDate: '2026-01-01', endDate: '2026-01-10' });

    expect(result.topRooms).toHaveLength(5);
    expect(result.topRooms.map((r) => r.revenue)).toEqual([70000, 60000, 50000, 40000, 30000]);
  });
});
