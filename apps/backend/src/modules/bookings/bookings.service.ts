import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';

const INCLUDE_RELATIONS = {
  room: { select: { id: true, roomNumber: true, floor: true, pricePerNight: true } },
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

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
    const totalPrice = nights * Number(room.pricePerNight);

    const created = await this.prisma.booking.create({
      data: {
        tenantId: resolvedTenantId,
        roomId: room.id,
        guestId,
        checkIn,
        checkOut,
        totalPrice,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      },
      include: INCLUDE_RELATIONS,
    });

    this.notifications.notifyAdmins(resolvedTenantId, 'booking.created', created);

    return created;
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
