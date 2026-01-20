import { Controller, Get, Query } from '@nestjs/common';
import { SplitIntegrationsService } from './split-integrations.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('split-integrations')
export class SplitIntegrationsController {
  constructor(
    private readonly splitIntegrationsService: SplitIntegrationsService,
  ) {}

  @Public()
  @Get('mercadopago')
  async handleMercadoPagoCallback(@Query('code') code: string) {
    return this.splitIntegrationsService.handleMPCode(code);
  }
}
