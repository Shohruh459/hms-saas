import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindPublicRoomsDto } from './dto/find-public-rooms.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.HOTEL_OWNER, UserRole.RECEPTIONIST];
const STAFF_AND_HOUSEKEEPER_ROLES = [...STAFF_ROLES, UserRole.HOUSEKEEPER];

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('public')
  @ApiOperation({ summary: "Mehmonlar uchun ochiq xona qidiruvi (autentifikatsiyasiz, x-tenant-id header orqali)" })
  findPublicRooms(@CurrentTenant() tenantId: string | null, @Query() filter: FindPublicRoomsDto) {
    return this.roomsService.findPublic(tenantId, filter);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @ApiBearerAuth()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Yangi xona yaratish" })
  create(@CurrentTenant() tenantId: string | null, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @ApiBearerAuth()
  @Roles(...STAFF_AND_HOUSEKEEPER_ROLES)
  @ApiOperation({ summary: "Mehmonxona xonalari ro'yxati" })
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.roomsService.findAll(tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @ApiBearerAuth()
  @Roles(...STAFF_AND_HOUSEKEEPER_ROLES)
  @ApiOperation({ summary: "Bitta xona ma'lumotlari" })
  findOne(@CurrentTenant() tenantId: string | null, @Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @ApiBearerAuth()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Xona ma'lumotlarini yangilash" })
  update(
    @CurrentTenant() tenantId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_OWNER)
  @ApiOperation({ summary: "Xonani o'chirish" })
  remove(@CurrentTenant() tenantId: string | null, @Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.remove(tenantId, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @ApiBearerAuth()
  @Roles(...STAFF_AND_HOUSEKEEPER_ROLES)
  @ApiOperation({ summary: "Xona statusini o'zgartirish (real-time xabar bilan)" })
  updateStatus(
    @CurrentTenant() tenantId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
  ) {
    return this.roomsService.updateStatus(tenantId, id, dto.status);
  }
}
