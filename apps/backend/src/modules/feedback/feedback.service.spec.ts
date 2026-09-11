import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { AiFeedbackService } from './ai-feedback.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FeedbackService', () => {
  let prisma: { feedback: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let aiFeedback: { analyze: jest.Mock };
  let service: FeedbackService;

  beforeEach(() => {
    prisma = {
      feedback: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    aiFeedback = { analyze: jest.fn() };
    service = new FeedbackService(prisma as unknown as PrismaService, aiFeedback as unknown as AiFeedbackService);
  });

  describe('create', () => {
    it('tenantId bo\'lmasa BadRequestException tashlaydi', async () => {
      await expect(service.create(null, { message: 'Salom' })).rejects.toBeInstanceOf(BadRequestException);
      expect(aiFeedback.analyze).not.toHaveBeenCalled();
    });

    it('AI natijasi asosida yozuv yaratadi va aiReply ni javobga qo\'shadi (bazaga saqlamasdan)', async () => {
      aiFeedback.analyze.mockResolvedValue({ reply: 'Kechirasiz, tez orada hal qilamiz', summary: 'Xona sovuq', category: 'COMPLAINT' });
      prisma.feedback.create.mockResolvedValue({
        id: 'f1',
        tenantId: 't1',
        message: 'Xonam sovuq',
        category: 'COMPLAINT',
        aiSummary: 'Xona sovuq',
        status: 'PENDING',
      });

      const result = await service.create('t1', { message: 'Xonam sovuq' });

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 't1', message: 'Xonam sovuq', category: 'COMPLAINT', aiSummary: 'Xona sovuq' }),
      });
      expect(result.aiReply).toBe('Kechirasiz, tez orada hal qilamiz');
      expect(result.id).toBe('f1');
    });
  });

  describe('findMyTickets', () => {
    it("faqat berilgan tenant + telefon bo'yicha qidiradi", async () => {
      prisma.feedback.findMany.mockResolvedValue([]);
      await service.findMyTickets('t1', '+998901234567');
      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1', guestPhone: '+998901234567' } }),
      );
    });
  });

  describe('reply', () => {
    it("mavjud bo'lmagan murojaat uchun NotFoundException tashlaydi", async () => {
      prisma.feedback.findUnique.mockResolvedValue(null);
      await expect(service.reply('missing', 'javob', 'admin@example.com')).rejects.toBeInstanceOf(NotFoundException);
    });

    it("javobni saqlaydi va statusni RESOLVED qiladi", async () => {
      prisma.feedback.findUnique.mockResolvedValue({ id: 'f1' });
      prisma.feedback.update.mockResolvedValue({ id: 'f1', adminReply: 'javob', status: 'RESOLVED' });

      const result = await service.reply('f1', 'javob', 'admin@example.com');

      expect(prisma.feedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f1' },
          data: expect.objectContaining({ adminReply: 'javob', repliedBy: 'admin@example.com', status: 'RESOLVED' }),
          include: { tenant: expect.objectContaining({ select: expect.objectContaining({ name: true }) }) },
        }),
      );
      expect(result.status).toBe('RESOLVED');
    });
  });
});
