import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly gateway: NotificationsGateway) {}

  notifyAdmins(tenantId: string, event: string, payload: unknown) {
    this.gateway.emitToRoom(NotificationsGateway.tenantGroupRoom(tenantId, 'admins'), event, payload);
  }

  notifyHousekeepers(tenantId: string, event: string, payload: unknown) {
    this.gateway.emitToRoom(NotificationsGateway.tenantGroupRoom(tenantId, 'housekeepers'), event, payload);
  }

  notifyGuests(tenantId: string, event: string, payload: unknown) {
    this.gateway.emitToRoom(NotificationsGateway.tenantGroupRoom(tenantId, 'guests'), event, payload);
  }

  notifyUser(userId: string, event: string, payload: unknown) {
    this.gateway.emitToRoom(NotificationsGateway.userRoom(userId), event, payload);
  }
}
