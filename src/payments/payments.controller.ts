import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePreferenceDto } from './mercadopago/dto/create-preference.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  @UseGuards(OptionalJwtAuthGuard)
  async createPaymentPreference(
    @Body() createPreferenceDto: CreatePreferenceDto,
    @CurrentUser() user?: User,
  ) {
    const { orderId } = createPreferenceDto;

    if (!orderId) {
      throw new BadRequestException('orderId es requerido');
    }

    const result =
      await this.paymentsService.initiateMercadoPagoPayment(orderId);

    return {
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
    };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getPaymentById(@Param('id') id: string, @CurrentUser() user?: User) {
    const payment = await this.paymentsService.getPaymentById(id);

    return payment;
  }

  @Get('order/:orderId')
  @UseGuards(OptionalJwtAuthGuard)
  async getPaymentByOrderId(
    @Param('orderId') orderId: string,
    @CurrentUser() user?: User,
  ) {
    const orderIdNumber = parseInt(orderId, 10);

    if (isNaN(orderIdNumber)) {
      throw new BadRequestException('orderId debe ser un número válido');
    }

    const payment =
      await this.paymentsService.getPaymentByOrderId(orderIdNumber);

    return payment;
  }
}
