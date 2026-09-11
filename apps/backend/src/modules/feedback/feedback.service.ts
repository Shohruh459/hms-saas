import { Injectable, NotFoundException } from '@nestjs/common';
import { requireTenantId } from '../../common/utils/require-tenant-id';
import { PrismaService } from '../../prisma/prisma.service';
import { AiFeedbackService } from './ai-feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFeedback: AiFeedbackService,
  ) {}

  /**
   * Mehmon murojaatini qabul qiladi, AI orqali xushmuomala javob + qisqa
   * mazmun + kategoriya generatsiya qiladi va bazaga saqlaydi. AI'ning
   * darhol javobi (aiReply) bazaga saqlanmaydi — faqat shu so'rovga javoban
   * mehmonga bir marta ko'rsatiladi; keyinroq faqat Superadmin javobi
   * (adminReply) "mening murojaatlarim"da ko'rinadi.
   */
  async create(tenantId: string | null, dto: CreateFeedbackDto) {
    const resolvedTenantId = requireTenantId(tenantId);
    const ai = await this.aiFeedback.analyze(dto.message);

    const feedback = await this.prisma.feedback.create({
      data: {
        tenantId: resolvedTenantId,
        roomNumber: dto.roomNumber,
        guestPhone: dto.guestPhone,
        guestName: dto.guestName,
        message: dto.message,
        category: ai.category,
        aiSummary: ai.summary,
      },
    });

    return { ...feedback, aiReply: ai.reply };
  }

  findMyTickets(tenantId: string | null, phone: string) {
    return this.prisma.feedback.findMany({
      where: { tenantId: requireTenantId(tenantId), guestPhone: phone },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        category: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        createdAt: true,
      },
    });
  }

  findAllForSuperadmin() {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, subdomain: true, phone: true } },
      },
    });
  }

  async reply(id: string, reply: string, repliedByEmail: string) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    return this.prisma.feedback.update({
      where: { id },
      data: {
        adminReply: reply,
        repliedAt: new Date(),
        repliedBy: repliedByEmail,
        status: 'RESOLVED',
      },
      include: {
        tenant: { select: { id: true, name: true, subdomain: true, phone: true } },
      },
    });
  }
}
