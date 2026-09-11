import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperadminAccessGuard } from '../../common/guards/superadmin-access.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperadminAccessGuard)
@Controller('admin/feedbacks')
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: "Barcha mehmonxonalardan tushgan murojaatlar ro'yxati (Superadmin)" })
  findAll() {
    return this.feedbackService.findAllForSuperadmin();
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Superadmin murojaatga javob yozadi va statusni RESOLVED qiladi' })
  reply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplyFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.feedbackService.reply(id, dto.reply, user.email ?? 'unknown');
  }
}
