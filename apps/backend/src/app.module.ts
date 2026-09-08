import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global standart: bir IP uchun daqiqasiga 100 so'rov. Login/register
    // kabi og'ir marshrutlar o'z @Throttle() qiymatlari bilan buni ustidan
    // qattiqroq cheklaydi (auth.controller.ts).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    NotificationsModule,
    RoomsModule,
    ServiceRequestsModule,
    SupportTicketsModule,
    BookingsModule,
    PaymentsModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
