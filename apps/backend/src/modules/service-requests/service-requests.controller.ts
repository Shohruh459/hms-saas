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
import { AdminDecisionDto } from './dto/admin-decision.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { ListServiceRequestsDto } from './dto/list-service-requests.dto';
import { StaffFulfillDto } from './dto/staff-fulfill.dto';
import { ServiceRequestsService } from './service-requests.service';

const STAFF_AND_HOUSEKEEPER_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.HOTEL_OWNER,
  UserRole.RECEPTIONIST,
  UserRole.HOUSEKEEPER,
];

@ApiTags('service-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

  @Get()
  @Roles(...STAFF_AND_HOUSEKEEPER_ROLES)
  @ApiOperation({ summary: "Tenant'ga tegishli barcha xizmatchi so'rovlari (filtrlash bilan)" })
  findAll(@CurrentTenant() tenantId: string | null, @Query() filter: ListServiceRequestsDto) {
    return this.serviceRequestsService.findAll(tenantId, filter.status);
  }

  @Post('guest')
  @Roles(UserRole.GUEST)
  @ApiOperation({ summary: "Mehmon tomonidan xona xizmatchisini chaqirish" })
  createByGuest(@CurrentTenant() tenantId: string | null, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    return this.serviceRequestsService.createByGuest(tenantId, user.id, dto);
  }

  @Patch(':id/admin-approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_OWNER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Admin tomonidan so'rovni tasdiqlash/rad etish" })
  adminApprove(
    @CurrentTenant() tenantId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminDecisionDto,
  ) {
    return this.serviceRequestsService.adminApprove(tenantId, id, dto);
  }

  @Patch(':id/staff-fulfill')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOUSEKEEPER)
  @ApiOperation({ summary: "Xizmatchi tomonidan bajarilganini belgilash" })
  staffFulfill(
    @CurrentTenant() tenantId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffFulfillDto,
  ) {
    return this.serviceRequestsService.staffFulfill(tenantId, id, dto);
  }
}
