import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('public')
  @ApiOperation({ summary: "Mehmonxonaning ochiq (secret bo'lmagan) ma'lumotlari — x-tenant-id header orqali" })
  findPublic(@CurrentTenant() tenantId: string | null) {
    return this.tenantsService.findPublic(tenantId);
  }
}
