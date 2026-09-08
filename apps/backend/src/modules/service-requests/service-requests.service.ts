import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceRequestStatus } from '@prisma/client';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminDecisionDto } from './dto/admin-decision.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { StaffFulfillDto } from './dto/staff-fulfill.dto';

const INCLUDE_RELATIONS = {
  room: { select: { id: true, roomNumber: true, floor: true } },
  guest: { select: { id: true, fullName: true, phone: true, email: true } },
} as const;

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(tenantId: string | null, status?: ServiceRequestStatus) {
    return this.prisma.serviceRequest.findMany({
      where: { tenantId: requireTenantId(tenantId), status },
      include: INCLUDE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createByGuest(tenantId: string | null, guestId: string, dto: CreateServiceRequestDto) {
    const resolvedTenantId = requireTenantId(tenantId);

    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, tenantId: resolvedTenantId } });
    if (!room) {
      throw new NotFoundException('Xona topilmadi');
    }

    const created = await this.prisma.serviceRequest.create({
      data: {
        tenantId: resolvedTenantId,
        roomId: dto.roomId,
        guestId,
        reason: dto.reason,
        status: ServiceRequestStatus.PENDING_ADMIN,
      },
      include: INCLUDE_RELATIONS,
    });

    this.notifications.notifyAdmins(resolvedTenantId, 'service-request.created', created);

    return created;
  }

  async adminApprove(tenantId: string | null, id: string, dto: AdminDecisionDto) {
    const resolvedTenantId = requireTenantId(tenantId);
    const existing = await this.findWithinTenant(resolvedTenantId, id);

    if (existing.status !== ServiceRequestStatus.PENDING_ADMIN) {
      throw new BadRequestException("So'rov allaqachon ko'rib chiqilgan");
    }

    const status = dto.approve ? ServiceRequestStatus.APPROVED_BY_ADMIN : ServiceRequestStatus.REJECTED_BY_ADMIN;

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: { status, staffNotes: dto.staffNotes },
      include: INCLUDE_RELATIONS,
    });

    if (dto.approve) {
      this.notifications.notifyHousekeepers(resolvedTenantId, 'service-request.approved', updated);
    }
    this.notifications.notifyUser(
      updated.guestId,
      dto.approve ? 'service-request.approved' : 'service-request.rejected',
      updated,
    );

    return updated;
  }

  async staffFulfill(tenantId: string | null, id: string, dto: StaffFulfillDto) {
    const resolvedTenantId = requireTenantId(tenantId);
    const existing = await this.findWithinTenant(resolvedTenantId, id);

    if (existing.status !== ServiceRequestStatus.APPROVED_BY_ADMIN) {
      throw new BadRequestException("So'rov hali admin tomonidan tasdiqlanmagan");
    }

    const status = dto.completed ? ServiceRequestStatus.COMPLETED : ServiceRequestStatus.FAILED;

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: { status, staffNotes: dto.staffNotes },
      include: INCLUDE_RELATIONS,
    });

    const event = dto.completed ? 'service-request.completed' : 'service-request.failed';
    this.notifications.notifyUser(updated.guestId, event, updated);
    this.notifications.notifyAdmins(resolvedTenantId, event, updated);

    return updated;
  }

  private async findWithinTenant(tenantId: string, id: string) {
    const request = await this.prisma.serviceRequest.findFirst({ where: { id, tenantId } });
    if (!request) {
      throw new NotFoundException("So'rov topilmadi");
    }
    return request;
  }
}
