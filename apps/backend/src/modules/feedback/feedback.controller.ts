import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FindMyTicketsDto } from './dto/find-my-tickets.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('ai-chat')
  @ApiOperation({ summary: "Mehmon murojaatini yuborish — AI darhol xushmuomala javob qaytaradi" })
  create(@CurrentTenant() tenantId: string | null, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(tenantId, dto);
  }

  @Get('my-tickets')
  @ApiOperation({ summary: "Mehmon o'z telefon raqami orqali oldingi murojaatlari va Superadmin javobini ko'radi" })
  findMyTickets(@CurrentTenant() tenantId: string | null, @Query() query: FindMyTicketsDto) {
    return this.feedbackService.findMyTickets(tenantId, query.phone);
  }
}
