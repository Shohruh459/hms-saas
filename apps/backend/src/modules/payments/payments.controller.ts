import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClickService } from './click.service';
import { PaymeService } from './payme.service';
import { StripeService } from './stripe.service';

type RequestWithRawBody = Request & { rawBody?: Buffer };

/**
 * To'lov provayderlarining server-server webhook/callback endpoint'lari.
 * Bu marshrutlarga bizning JWT bilan emas, balki har bir provayderning
 * o'z protokol darajasidagi imzosi (Click MD5, Payme Basic Auth, Stripe
 * HMAC) orqali ishonch bildiriladi — shu sababli JwtAuthGuard qo'llanmaydi.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly clickService: ClickService,
    private readonly paymeService: PaymeService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('click/prepare')
  @HttpCode(200)
  @ApiOperation({ summary: "Click Merchant API — Prepare so'rovi" })
  @ApiBody({ description: 'Click Prepare payload (form/JSON)', type: Object })
  clickPrepare(@Body() body: Record<string, any>) {
    return this.clickService.prepare(body);
  }

  @Post('click/complete')
  @HttpCode(200)
  @ApiOperation({ summary: "Click Merchant API — Complete so'rovi" })
  @ApiBody({ description: 'Click Complete payload (form/JSON)', type: Object })
  clickComplete(@Body() body: Record<string, any>) {
    return this.clickService.complete(body);
  }

  @Post('payme')
  @HttpCode(200)
  @ApiOperation({ summary: 'Payme JSON-RPC 2.0 endpoint' })
  @ApiBody({ description: "Payme JSON-RPC so'rovi ({ method, params, id })", type: Object })
  payme(
    @Body() body: { method: string; params: Record<string, any>; id: number | string },
    @Headers('authorization') authorization?: string,
  ) {
    return this.paymeService.handle(body, authorization);
  }

  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Stripe webhook (payment_intent.succeeded / checkout.session.completed)' })
  stripeWebhook(@Req() req: RequestWithRawBody, @Headers('stripe-signature') signature?: string) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.stripeService.handleWebhook(rawBody, signature, req.body);
  }
}
