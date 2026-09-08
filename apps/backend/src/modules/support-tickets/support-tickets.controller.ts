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
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { RespondSupportTicketDto } from './dto/respond-support-ticket.dto';
import { SupportTicketsService } from './support-tickets.service';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.HOTEL_OWNER, UserRole.RECEPTIONIST];

@ApiTags('support-tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  @Roles(UserRole.GUEST)
  @ApiOperation({ summary: "Mehmon tomonidan shikoyat/yordam so'rovi yuborish" })
  create(
    @CurrentTenant() tenantId: string | null,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportTicketsService.create(tenantId, user.id, dto);
  }

  @Get()
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Tenant'ga tegishli barcha biletlar ro'yxati (filtrlash bilan)" })
  findAll(@CurrentTenant() tenantId: string | null, @Query() filter: ListSupportTicketsDto) {
    return this.supportTicketsService.findAll(tenantId, filter);
  }

  @Patch(':id/respond')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Admin tomonidan biletga javob qaytarish' })
  respond(
    @CurrentTenant() tenantId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondSupportTicketDto,
  ) {
    return this.supportTicketsService.respond(tenantId, id, dto);
  }
}
