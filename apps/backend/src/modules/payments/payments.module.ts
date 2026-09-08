import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClickService } from './click.service';
import { PaymeService } from './payme.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ClickService, PaymeService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
