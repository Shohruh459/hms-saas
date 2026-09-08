import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceRequestStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceRequestsService } from './service-requests.service';

describe('ServiceRequestsService', () => {
  const tenantId = 'tenant-1';
  const roomId = 'room-1';
  const guestId = 'guest-1';
  const requestId = 'req-1';

  let prisma: {
    room: { findFirst: jest.Mock };
    serviceRequest: { create: jest.Mock; update: jest.Mock; findFirst: jest.Mock };
  };
  let notifications: {
    notifyAdmins: jest.Mock;
    notifyHousekeepers: jest.Mock;
    notifyUser: jest.Mock;
  };
  let service: ServiceRequestsService;

  beforeEach(() => {
    prisma = {
      room: { findFirst: jest.fn() },
      serviceRequest: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    };
    notifications = {
      notifyAdmins: jest.fn(),
      notifyHousekeepers: jest.fn(),
      notifyUser: jest.fn(),
    };
    service = new ServiceRequestsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('createByGuest', () => {
    it('xona ushbu tenantda topilmasa NotFoundException tashlaydi', async () => {
      prisma.room.findFirst.mockResolvedValue(null);

      await expect(service.createByGuest(tenantId, guestId, { roomId, reason: 'Sochiq kerak' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.serviceRequest.create).not.toHaveBeenCalled();
    });

    it("so'rov yaratadi va adminlarga xabar yuboradi", async () => {
      prisma.room.findFirst.mockResolvedValue({ id: roomId, tenantId });
      const created = { id: requestId, tenantId, roomId, guestId, status: ServiceRequestStatus.PENDING_ADMIN };
      prisma.serviceRequest.create.mockResolvedValue(created);

      const result = await service.createByGuest(tenantId, guestId, { roomId, reason: 'Sochiq kerak' });

      expect(result).toBe(created);
      expect(notifications.notifyAdmins).toHaveBeenCalledWith(tenantId, 'service-request.created', created);
    });
  });

  describe('adminApprove', () => {
    it("PENDING_ADMIN holatida bo'lmagan so'rovni qayta ko'rib chiqmaydi", async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue({
        id: requestId,
        tenantId,
        status: ServiceRequestStatus.APPROVED_BY_ADMIN,
      });

      await expect(service.adminApprove(tenantId, requestId, { approve: true })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.serviceRequest.update).not.toHaveBeenCalled();
    });

    it("tasdiqlaganda housekeeper va guestga xabar beradi", async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue({
        id: requestId,
        tenantId,
        guestId,
        status: ServiceRequestStatus.PENDING_ADMIN,
      });
      const updated = { id: requestId, tenantId, guestId, status: ServiceRequestStatus.APPROVED_BY_ADMIN };
      prisma.serviceRequest.update.mockResolvedValue(updated);

      const result = await service.adminApprove(tenantId, requestId, { approve: true });

      expect(result).toBe(updated);
      expect(notifications.notifyHousekeepers).toHaveBeenCalledWith(tenantId, 'service-request.approved', updated);
      expect(notifications.notifyUser).toHaveBeenCalledWith(guestId, 'service-request.approved', updated);
    });

    it("rad etganda housekeeperlarga xabar yubormaydi, faqat guestga", async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue({
        id: requestId,
        tenantId,
        guestId,
        status: ServiceRequestStatus.PENDING_ADMIN,
      });
      const updated = { id: requestId, tenantId, guestId, status: ServiceRequestStatus.REJECTED_BY_ADMIN };
      prisma.serviceRequest.update.mockResolvedValue(updated);

      await service.adminApprove(tenantId, requestId, { approve: false });

      expect(notifications.notifyHousekeepers).not.toHaveBeenCalled();
      expect(notifications.notifyUser).toHaveBeenCalledWith(guestId, 'service-request.rejected', updated);
    });
  });

  describe('staffFulfill', () => {
    it("APPROVED_BY_ADMIN holatida bo'lmagan so'rovni bajarib bo'lmaydi", async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue({
        id: requestId,
        tenantId,
        status: ServiceRequestStatus.PENDING_ADMIN,
      });

      await expect(service.staffFulfill(tenantId, requestId, { completed: true })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.serviceRequest.update).not.toHaveBeenCalled();
    });

    it("bajarilganda guest va adminlarga xabar beradi", async () => {
      prisma.serviceRequest.findFirst.mockResolvedValue({
        id: requestId,
        tenantId,
        guestId,
        status: ServiceRequestStatus.APPROVED_BY_ADMIN,
      });
      const updated = { id: requestId, tenantId, guestId, status: ServiceRequestStatus.COMPLETED };
      prisma.serviceRequest.update.mockResolvedValue(updated);

      await service.staffFulfill(tenantId, requestId, { completed: true, staffNotes: 'Yetkazildi' });

      expect(notifications.notifyUser).toHaveBeenCalledWith(guestId, 'service-request.completed', updated);
      expect(notifications.notifyAdmins).toHaveBeenCalledWith(tenantId, 'service-request.completed', updated);
    });
  });
});
