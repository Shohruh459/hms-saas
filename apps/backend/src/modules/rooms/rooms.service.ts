import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma, Room, RoomStatus, RoomType } from '@prisma/client';
import { assertTenantActive } from '../../common/utils/assert-tenant-active';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindPublicRoomsDto } from './dto/find-public-rooms.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(tenantId: string | null, dto: CreateRoomDto) {
    try {
      return await this.prisma.room.create({
        data: { ...dto, tenantId: requireTenantId(tenantId) },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async findAll(tenantId: string | null) {
    const rooms = await this.prisma.room.findMany({
      where: { tenantId: requireTenantId(tenantId) },
      orderBy: { roomNumber: 'asc' },
    });
    return this.attachBedAvailability(rooms);
  }

  async findOne(tenantId: string | null, id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId: requireTenantId(tenantId) },
    });
    if (!room) {
      throw new NotFoundException('Xona topilmadi');
    }
    return room;
  }

  async update(tenantId: string | null, id: string, dto: UpdateRoomDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.prisma.room.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async remove(tenantId: string | null, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.room.delete({ where: { id } });
    return { success: true };
  }

  async updateStatus(tenantId: string | null, id: string, status: RoomStatus) {
    const resolvedTenantId = requireTenantId(tenantId);
    await this.findOne(resolvedTenantId, id);

    const updated = await this.prisma.room.update({ where: { id }, data: { status } });

    this.notifications.notifyAdmins(resolvedTenantId, 'room.status_changed', updated);
    this.notifications.notifyHousekeepers(resolvedTenantId, 'room.status_changed', updated);

    return updated;
  }

  /**
   * Mehmonlar uchun ochiq (autentifikatsiyasiz) qidiruv — faqat bo'sh
   * (AVAILABLE) xonalar, narx/sig'im/reyting/qulayliklar bo'yicha filtr.
   */
  async findPublic(tenantId: string | null, filter: FindPublicRoomsDto) {
    const resolvedTenantId = requireTenantId(tenantId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
      select: { status: true, subscriptionEndsAt: true },
    });
    if (!tenant) {
      throw new NotFoundException('Mehmonxona topilmadi');
    }
    assertTenantActive(tenant);

    const amenityList = filter.amenities
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const rooms = await this.prisma.room.findMany({
      where: {
        tenantId: resolvedTenantId,
        status: RoomStatus.AVAILABLE,
        pricePerNight: {
          gte: filter.minPrice,
          lte: filter.maxPrice,
        },
        capacity: filter.capacity ? { gte: filter.capacity } : undefined,
        rating: filter.minRating ? { gte: filter.minRating } : undefined,
        amenities: amenityList?.length ? { hasEvery: amenityList } : undefined,
      },
      orderBy: { pricePerNight: 'asc' },
    });

    return this.attachBedAvailability(rooms);
  }

  /**
   * SHARED xonalar uchun har bir xonaga "remainingBeds" (hozir/kelajakda band
   * qilinmagan koykalar soni) maydonini qo'shadi — frontendda "Qolgan bo'sh
   * krovatlar soni" ko'rsatish uchun. PRIVATE xonalar o'zgarishsiz qaytadi.
   */
  private async attachBedAvailability<T extends Room>(rooms: T[]): Promise<(T & { remainingBeds?: number })[]> {
    const sharedRoomIds = rooms.filter((room) => room.type === RoomType.SHARED).map((room) => room.id);
    if (sharedRoomIds.length === 0) {
      return rooms;
    }

    const activeBookings = await this.prisma.booking.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: sharedRoomIds },
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.CHECKED_OUT] },
        checkOut: { gt: new Date() },
      },
      _sum: { bedsBooked: true },
    });
    const bookedByRoom = new Map(activeBookings.map((entry) => [entry.roomId, entry._sum.bedsBooked ?? 0]));

    return rooms.map((room) =>
      room.type === RoomType.SHARED
        ? { ...room, remainingBeds: Math.max(room.totalBeds - (bookedByRoom.get(room.id) ?? 0), 0) }
        : room,
    );
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException("Bu xona raqami ushbu mehmonxonada allaqachon mavjud");
    }
    return error;
  }
}
