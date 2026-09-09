import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';

@ApiTags('discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('hotels')
  @ApiOperation({
    summary:
      "Ommaviy mehmonxonalar ochilishi (reyting ro'yxati, xarita, video feed) — faqat ACTIVE va video tasdiqlangan",
  })
  findHotels(@Query('region') region?: string) {
    return this.discoveryService.findHotels(region);
  }
}
