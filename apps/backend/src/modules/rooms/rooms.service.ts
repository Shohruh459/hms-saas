import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoomStatus } from '@prisma/client';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
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

  findAll(tenantId: string | null) {
    return this.prisma.room.findMany({
      where: { tenantId: requireTenantId(tenantId) },
      orderBy: { roomNumber: 'asc' },
    });
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

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException("Bu xona raqami ushbu mehmonxonada allaqachon mavjud");
    }
    return error;
  }
}
