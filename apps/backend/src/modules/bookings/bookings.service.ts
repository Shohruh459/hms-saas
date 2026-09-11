import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, GenderPolicy, GuestGender, PaymentStatus, Room, RoomType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';

const INCLUDE_RELATIONS = {
  room: {
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      pricePerNight: true,
      type: true,
      genderPolicy: true,
      totalBeds: true,
      pricePerBed: true,
    },
  },
  guest: { select: { id: true, fullName: true, phone: true, email: true } },
} as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(tenantId: string | null, currentUser: AuthenticatedUser, dto: CreateBookingDto) {
    const resolvedTenantId = requireTenantId(tenantId);

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    if (checkOut <= checkIn) {
      throw new BadRequestException("checkOut sanasi checkIn sanasidan keyin bo'lishi kerak");
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (checkIn < startOfToday) {
      throw new BadRequestException("checkIn o'tmishdagi sana bo'lishi mumkin emas");
    }

    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, tenantId: resolvedTenantId } });
    if (!room) {
      throw new NotFoundException('Xona topilmadi');
    }

    const guestId = await this.resolveGuestId(resolvedTenantId, currentUser, dto.guestId);

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
    const { totalPrice, bedsBooked, guestGender } = await this.resolveAvailabilityAndPrice(room, checkIn, checkOut, nights, dto);

    const created = await this.prisma.booking.create({
      data: {
        tenantId: resolvedTenantId,
        roomId: room.id,
        guestId,
        checkIn,
        checkOut,
        totalPrice,
        bedsBooked,
        guestGender,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      },
      include: INCLUDE_RELATIONS,
    });

    this.notifications.notifyAdmins(resolvedTenantId, 'booking.created', created);

    return created;
  }

  /**
   * PRIVATE — eski mantiq: sanalar ustma-ust tushsa butun xona band deb hisoblanadi.
   * SHARED — koykalar yig'indisi (`bedsBooked`) taqqoslanadi va jins siyosati
   * (Gender Lock) tekshiriladi: MALE_ONLY/FEMALE_ONLY — faqat mos jins;
   * MIXED — xonada allaqachon faol mehmon(lar) bo'lsa, ularning jinsiga mos kelishi kerak.
   */
  private async resolveAvailabilityAndPrice(
    room: Pick<Room, 'id' | 'pricePerNight' | 'type' | 'genderPolicy' | 'totalBeds' | 'pricePerBed'>,
    checkIn: Date,
    checkOut: Date,
    nights: number,
    dto: CreateBookingDto,
  ): Promise<{ totalPrice: number; bedsBooked: number; guestGender: GuestGender | null }> {
    if (room.type === RoomType.PRIVATE) {
      const overlapping = await this.prisma.booking.findFirst({
        where: {
          roomId: room.id,
          status: { not: BookingStatus.CANCELLED },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });
      if (overlapping) {
        throw new ConflictException('Xona ushbu sanalar oralig\'ida allaqachon band qilingan');
      }

      return { totalPrice: nights * Number(room.pricePerNight), bedsBooked: 1, guestGender: null };
    }

    // SHARED xona
    if (!dto.guestGender) {
      throw new BadRequestException("Umumiy (SHARED) xona uchun mehmon jinsini ko'rsatish shart");
    }
    if (room.genderPolicy === GenderPolicy.MALE_ONLY && dto.guestGender !== GuestGender.MALE) {
      throw new ConflictException('Bu xona faqat erkaklar uchun');
    }
    if (room.genderPolicy === GenderPolicy.FEMALE_ONLY && dto.guestGender !== GuestGender.FEMALE) {
      throw new ConflictException('Bu xona faqat ayollar uchun');
    }

    const requestedBeds = dto.bedsBooked ?? 1;

    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        roomId: room.id,
        status: { not: BookingStatus.CANCELLED },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { bedsBooked: true, guestGender: true },
    });

    const bookedBeds = overlappingBookings.reduce((sum, booking) => sum + booking.bedsBooked, 0);
    if (bookedBeds + requestedBeds > room.totalBeds) {
      throw new ConflictException("Xonada yetarli bo'sh krovat yo'q");
    }

    if (room.genderPolicy === GenderPolicy.MIXED) {
      const existingGenders = new Set(overlappingBookings.map((booking) => booking.guestGender).filter(Boolean));
      if (existingGenders.size > 0 && !existingGenders.has(dto.guestGender)) {
        throw new ConflictException('Bu xonada allaqachon boshqa jinsdagi mehmon(lar) bor');
      }
    }

    return {
      totalPrice: nights * Number(room.pricePerBed ?? 0) * requestedBeds,
      bedsBooked: requestedBeds,
      guestGender: dto.guestGender,
    };
  }

  findAll(tenantId: string | null, currentUser: AuthenticatedUser, filter: ListBookingsDto) {
    const resolvedTenantId = requireTenantId(tenantId);

    return this.prisma.booking.findMany({
      where: {
        tenantId: resolvedTenantId,
        status: filter.status,
        guestId: currentUser.role === UserRole.GUEST ? currentUser.id : undefined,
      },
      include: INCLUDE_RELATIONS,
      orderBy: { checkIn: 'desc' },
    });
  }

  async cancel(tenantId: string | null, currentUser: AuthenticatedUser, id: string) {
    const resolvedTenantId = requireTenantId(tenantId);

    const booking = await this.prisma.booking.findFirst({ where: { id, tenantId: resolvedTenantId } });
    if (!booking) {
      throw new NotFoundException('Bron topilmadi');
    }

    if (currentUser.role === UserRole.GUEST && booking.guestId !== currentUser.id) {
      throw new ForbiddenException("Faqat o'zingizning bronlaringizni bekor qila olasiz");
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Bron allaqachon bekor qilingan');
    }
    if (booking.status === BookingStatus.CHECKED_OUT) {
      throw new BadRequestException("Checkout qilingan bronni bekor qilib bo'lmaydi");
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: INCLUDE_RELATIONS,
    });

    this.notifications.notifyAdmins(resolvedTenantId, 'booking.cancelled', updated);
    this.notifications.notifyUser(updated.guestId, 'booking.cancelled', updated);

    return updated;
  }

  private async resolveGuestId(tenantId: string, currentUser: AuthenticatedUser, dtoGuestId?: string) {
    if (currentUser.role === UserRole.GUEST) {
      return currentUser.id;
    }

    if (!dtoGuestId) {
      throw new BadRequestException("Xodim bron qilayotganda guestId ko'rsatilishi shart");
    }

    const guest = await this.prisma.user.findFirst({
      where: { id: dtoGuestId, tenantId, role: UserRole.GUEST },
    });
    if (!guest) {
      throw new NotFoundException('Mehmon topilmadi');
    }

    return guest.id;
  }
}
