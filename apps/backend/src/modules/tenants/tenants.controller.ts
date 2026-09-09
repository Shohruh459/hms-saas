import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterHotelDto } from './dto/register-hotel.dto';
import { TenantsService } from './tenants.service';

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('public')
  @ApiOperation({ summary: "Mehmonxonaning ochiq (secret bo'lmagan) ma'lumotlari — x-tenant-id header orqali" })
  findPublic(@CurrentTenant() tenantId: string | null) {
    return this.tenantsService.findPublic(tenantId);
  }

  @Post('register')
  @ApiOperation({ summary: "Yangi mehmonxonani o'z-o'zidan ro'yxatdan o'tkazish (status: PENDING)" })
  registerHotel(@Body() dto: RegisterHotelDto) {
    return this.tenantsService.registerHotel(dto);
  }

  @Post('video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.HOTEL_OWNER)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Mehmonxona ro'yxatdan o'tish videosini yuklash (Cloudflare R2)" })
  @UseInterceptors(FileInterceptor('video'))
  uploadVideo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_VIDEO_SIZE_BYTES })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Faqat video fayllar qabul qilinadi');
    }
    if (!user.tenantId) {
      throw new BadRequestException('Foydalanuvchi hech qaysi mehmonxonaga bog\'lanmagan');
    }
    return this.tenantsService.uploadVideo(user.tenantId, file);
  }
}
