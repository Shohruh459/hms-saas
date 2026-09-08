import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';

const BOOKING_ROLES = [UserRole.SUPER_ADMIN, UserRole.HOTEL_OWNER, UserRole.RECEPTIONIST, UserRole.GUEST];

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(...BOOKING_ROLES)
  @ApiOperation({ summary: "Xonani bron qilish (sana va bo'shliqni tekshirish bilan)" })
  create(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(tenantId, user, dto);
  }

  @Get()
  @Roles(...BOOKING_ROLES)
  @ApiOperation({ summary: "Bronlar ro'yxati (Admin — barchasi, Mehmon — faqat o'zining)" })
  findAll(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ListBookingsDto,
  ) {
    return this.bookingsService.findAll(tenantId, user, filter);
  }

  @Patch(':id/cancel')
  @Roles(...BOOKING_ROLES)
  @ApiOperation({ summary: "Bronni bekor qilish" })
  cancel(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingsService.cancel(tenantId, user, id);
  }
}
