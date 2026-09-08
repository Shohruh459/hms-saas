import { Injectable, NotFoundException } from '@nestjs/common';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { RespondSupportTicketDto } from './dto/respond-support-ticket.dto';

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(tenantId: string | null, guestId: string, dto: CreateSupportTicketDto) {
    const resolvedTenantId = requireTenantId(tenantId);

    const created = await this.prisma.supportTicket.create({
      data: {
        tenantId: resolvedTenantId,
        guestId,
        type: dto.type,
        message: dto.message,
      },
    });

    this.notifications.notifyAdmins(resolvedTenantId, 'support-ticket.created', created);

    return created;
  }

  findAll(tenantId: string | null, filter: ListSupportTicketsDto) {
    return this.prisma.supportTicket.findMany({
      where: {
        tenantId: requireTenantId(tenantId),
        status: filter.status,
        type: filter.type,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respond(tenantId: string | null, id: string, dto: RespondSupportTicketDto) {
    const resolvedTenantId = requireTenantId(tenantId);

    const existing = await this.prisma.supportTicket.findFirst({ where: { id, tenantId: resolvedTenantId } });
    if (!existing) {
      throw new NotFoundException('Bilet topilmadi');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { response: dto.response, status: dto.status },
    });

    this.notifications.notifyUser(updated.guestId, 'support-ticket.responded', updated);

    return updated;
  }
}
