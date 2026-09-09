import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperadminAccessGuard } from '../../common/guards/superadmin-access.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GrantSuperadminAccessDto } from './dto/grant-superadmin-access.dto';
import { SuperadminAccessService } from './superadmin-access.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperadminAccessGuard)
@Controller('admin/superadmin-access')
export class SuperadminAccessController {
  constructor(private readonly accessService: SuperadminAccessService) {}

  @Get()
  @ApiOperation({ summary: "Superadmin panelidan foydalanishga ruxsat berilgan pochtalar ro'yxati" })
  list() {
    return this.accessService.list();
  }

  @Post()
  @ApiOperation({ summary: "Yangi pochtaga superadmin panelidan foydalanish huquqini berish" })
  grant(@Body() dto: GrantSuperadminAccessDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accessService.grant(dto.email, user.email ?? 'unknown');
  }

  @Delete(':email')
  @ApiOperation({ summary: "Pochtadan superadmin panelidan foydalanish huquqini bekor qilish" })
  revoke(@Param('email') email: string) {
    return this.accessService.revoke(email);
  }
}
