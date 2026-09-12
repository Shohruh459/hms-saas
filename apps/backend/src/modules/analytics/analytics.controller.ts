import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsOverviewQueryDto } from './dto/analytics-overview-query.dto';

const ANALYTICS_ROLES = [UserRole.SUPER_ADMIN, UserRole.HOTEL_OWNER];

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(...ANALYTICS_ROLES)
  @ApiOperation({
    summary: "Mehmonxona analitikasi: daromad, bandlik, RevPAR, ADR, tendensiya, xona turi ulushi, top xonalar",
  })
  getOverview(@CurrentTenant() tenantId: string | null, @Query() query: AnalyticsOverviewQueryDto) {
    return this.analyticsService.getOverview(tenantId, query);
  }
}
