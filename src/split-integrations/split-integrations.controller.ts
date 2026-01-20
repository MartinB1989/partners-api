import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SplitIntegrationsService } from './split-integrations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role, User } from '@prisma/client';

@Controller('split-integrations')
export class SplitIntegrationsController {
  constructor(
    private readonly splitIntegrationsService: SplitIntegrationsService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Role.PRODUCTOR, Role.ADMIN)
  @Get('mercadopago')
  async handleMercadoPagoCallback(
    @Query('code') code: string,
    @CurrentUser() user: User,
  ) {
    return this.splitIntegrationsService.handleMPCode(code, user.id);
  }
}
