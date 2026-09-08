import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export type TenantRoleGroup = 'admins' | 'housekeepers' | 'guests';

const ROLE_GROUPS: Record<UserRole, TenantRoleGroup | null> = {
  [UserRole.SUPER_ADMIN]: null,
  [UserRole.HOTEL_OWNER]: 'admins',
  [UserRole.RECEPTIONIST]: 'admins',
  [UserRole.HOUSEKEEPER]: 'housekeepers',
  [UserRole.GUEST]: 'guests',
};

/**
 * Tenant va rol bo'yicha real-vaqt bildirishnomalar uchun Socket.IO gateway.
 * Har bir ulanish JWT access token bilan autentifikatsiya qilinadi
 * (`auth.token` yoki `Authorization: Bearer <token>` handshake orqali) va
 * mos xonalarga (`tenant_{tenantId}_{admins|housekeepers|guests}`,
 * `user_{userId}`) avtomatik biriktiriladi.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret',
      });
      client.data.user = payload;
      client.join(NotificationsGateway.userRoom(payload.sub));

      if (payload.tenantId) {
        const group = ROLE_GROUPS[payload.role];
        if (group) {
          client.join(NotificationsGateway.tenantGroupRoom(payload.tenantId, group));
        }
      }
    } catch (error) {
      this.logger.warn(`WebSocket autentifikatsiya muvaffaqiyatsiz: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const fromHeader = client.handshake.headers?.authorization;
    const raw = fromAuth ?? fromHeader;
    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.slice('Bearer '.length) : raw;
  }

  static userRoom(userId: string): string {
    return `user_${userId}`;
  }

  static tenantGroupRoom(tenantId: string, group: TenantRoleGroup): string {
    return `tenant_${tenantId}_${group}`;
  }
}
