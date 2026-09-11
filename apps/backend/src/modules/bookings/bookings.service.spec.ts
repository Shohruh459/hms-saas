import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';

describe('BookingsService', () => {
  let prisma: {
    room: { findFirst: jest.Mock };
    booking: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
  };
  let notifications: { notifyAdmins: jest.Mock; notifyUser: jest.Mock };
  let service: BookingsService;

  const guestUser: AuthenticatedUser = { id: 'guest-1', role: 'GUEST' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      room: { findFirst: jest.fn() },
      booking: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    };
    notifications = { notifyAdmins: jest.fn(), notifyUser: jest.fn() };
    service = new BookingsService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  });

  interface MockRoom {
    id: string;
    tenantId: string;
    pricePerNight: number;
    type: string;
    genderPolicy: string;
    totalBeds: number;
    pricePerBed: number | null;
  }

  function privateRoom(): MockRoom {
    return {
      id: 'room-1',
      tenantId: 't1',
      pricePerNight: 200000,
      type: 'PRIVATE',
      genderPolicy: 'MIXED',
      totalBeds: 1,
      pricePerBed: null,
    };
  }

  function sharedRoom(overrides: Partial<MockRoom> = {}): MockRoom {
    return {
      id: 'room-2',
      tenantId: 't1',
      pricePerNight: 0,
      type: 'SHARED',
      genderPolicy: 'MIXED',
      totalBeds: 4,
      pricePerBed: 80000,
      ...overrides,
    };
  }

  describe('PRIVATE xona', () => {
    it("bo'sh xonani bron qiladi, totalPrice = kecha * pricePerNight", async () => {
      prisma.room.findFirst.mockResolvedValue(privateRoom());
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 'b1', ...data }));

      const result = await service.create('t1', guestUser, {
        roomId: 'room-1',
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
      } as any);

      expect(Number(result.totalPrice)).toBe(600000);
      expect(result.bedsBooked).toBe(1);
      expect(result.guestGender).toBeNull();
    });

    it('ustma-ust sanaga bron qilinganda 1 kishi ham bo\'lsa butun xona yopiladi -> ConflictException', async () => {
      prisma.room.findFirst.mockResolvedValue(privateRoom());
      prisma.booking.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('t1', guestUser, { roomId: 'room-1', checkIn: '2026-12-01', checkOut: '2026-12-04' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('SHARED xona', () => {
    it("guestGender ko'rsatilmasa -> BadRequestException", async () => {
      prisma.room.findFirst.mockResolvedValue(sharedRoom());
      prisma.booking.findMany.mockResolvedValue([]);

      await expect(
        service.create('t1', guestUser, { roomId: 'room-2', checkIn: '2026-12-01', checkOut: '2026-12-03' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("MALE_ONLY xonaga FEMALE mehmon bron qilishga urinsa -> ConflictException", async () => {
      prisma.room.findFirst.mockResolvedValue(sharedRoom({ genderPolicy: 'MALE_ONLY' }));

      await expect(
        service.create('t1', guestUser, {
          roomId: 'room-2',
          checkIn: '2026-12-01',
          checkOut: '2026-12-03',
          guestGender: 'FEMALE',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("FEMALE_ONLY xonaga MALE mehmon bron qilishga urinsa -> ConflictException", async () => {
      prisma.room.findFirst.mockResolvedValue(sharedRoom({ genderPolicy: 'FEMALE_ONLY' }));

      await expect(
        service.create('t1', guestUser, {
          roomId: 'room-2',
          checkIn: '2026-12-01',
          checkOut: '2026-12-03',
          guestGender: 'MALE',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("koykalar yig'indisi totalBeds dan oshsa -> 409 'Xonada yetarli bo'sh krovat yo'q'", async () => {
      prisma.room.findFirst.mockResolvedValue(sharedRoom({ totalBeds: 4 }));
      prisma.booking.findMany.mockResolvedValue([
        { bedsBooked: 3, guestGender: 'MALE' },
      ]);

      await expect(
        service.create('t1', guestUser, {
          roomId: 'room-2',
          checkIn: '2026-12-01',
          checkOut: '2026-12-03',
          guestGender: 'MALE',
          bedsBooked: 2,
        } as any),
      ).rejects.toMatchObject({ status: 409, message: "Xonada yetarli bo'sh krovat yo'q" });
    });

    it("MIXED xonada allaqachon boshqa jinsdagi mehmon bo'lsa -> ConflictException", async () => {
      prisma.room.findFirst.mockResolvedValue(sharedRoom({ genderPolicy: 'MIXED', totalBeds: 4 }));
      prisma.booking.findMany.mockResolvedValue([{ bedsBooked: 1, guestGender: 'FEMALE' }]);

      await expect(
        service.create('t1', guestUser, {
          roomId: 'room-2',
          checkIn: '2026-12-01',
          checkOut: '2026-12-03',
          guestGender: 'MALE',
          bedsBooked: 1,
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("bir xil jinsdagi mehmon uchun bo'sh koyka bo'lsa -> muvaffaqiyatli, narx pricePerBed asosida", async () => {
      prisma.room.findFirst.mockResolvedValue(sharedRoom({ pricePerBed: 80000, totalBeds: 4 }));
      prisma.booking.findMany.mockResolvedValue([{ bedsBooked: 1, guestGender: 'MALE' }]);
      prisma.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 'b2', ...data }));

      const result = await service.create('t1', guestUser, {
        roomId: 'room-2',
        checkIn: '2026-12-01',
        checkOut: '2026-12-03',
        guestGender: 'MALE',
        bedsBooked: 2,
      } as any);

      expect(result.bedsBooked).toBe(2);
      expect(result.guestGender).toBe('MALE');
      expect(Number(result.totalPrice)).toBe(2 * 80000 * 2); // 2 kecha * 80000 * 2 koyka
    });
  });
});
