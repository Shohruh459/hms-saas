import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/tenants')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: "Barcha mehmonxonalar ro'yxati (Superadmin)" })
  findAll() {
    return this.adminService.findAllTenants();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: "Mehmonxona statusini o'zgartirish (faollashtirish/bloklash)" })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantStatusDto) {
    return this.adminService.updateStatus(id, dto.status);
  }

  @Patch(':id/extend-subscription')
  @ApiOperation({ summary: "Obunani 30 kunga uzaytirish" })
  extendSubscription(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.extendSubscription(id);
  }

  @Patch(':id/approve-video')
  @ApiOperation({ summary: "Mehmonxona videosini tasdiqlash" })
  approveVideo(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveVideo(id);
  }

  @Patch(':id/reject-video')
  @ApiOperation({ summary: "Mehmonxona videosini rad etish" })
  rejectVideo(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectVideo(id);
  }
}
