import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminFeedbackController } from './admin-feedback.controller';
import { AiFeedbackService } from './ai-feedback.service';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [AdminModule],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService, AiFeedbackService],
})
export class FeedbackModule {}
