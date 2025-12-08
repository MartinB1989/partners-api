import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto';
import { CartsService } from '../carts/carts.service';
import { SendOrderConfirmationEmailUseCase } from '../email/use-cases/send-order-confirmation-email.use-case';
import { PaymentsService } from '../payments/payments.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartsService: CartsService,
    private readonly paymentsService: PaymentsService,
    private readonly sendOrderConfirmationEmailUseCase: SendOrderConfirmationEmailUseCase,
  ) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    // NOTA: El email de confirmación se envía SOLO cuando el pago sea APPROVED (en el webhook de Mercado Pago)
    // No se envía aquí para evitar confusión si el pago falla o es rechazado

    // Paso 1: Crear la orden
    const order = await this.ordersService.create(createOrderDto);

    try {
      // Paso 2: Crear la preferencia de Mercado Pago
      const paymentPreference =
        await this.paymentsService.initiateMercadoPagoPayment(order.id);

      // Paso 3: Solo si todo fue exitoso, limpiar el carrito
      const cookies = req.cookies as Record<string, string>;
      const cartSessionId = cookies?.cart_session_id;

      if (cartSessionId) {
        try {
          const cart =
            await this.cartsService.findOneBySessionId(cartSessionId);
          if (cart) {
            await this.cartsService.clear(cart.id);
          }
        } catch (error) {
          // No interrumpir el flujo si hay error al vaciar el carrito
          console.error('Error al vaciar el carrito:', error);
        }
      }

      // Retornar orden con información de pago
      return {
        ...order,
        payment: {
          preferenceId: paymentPreference.preferenceId,
          initPoint: paymentPreference.initPoint,
        },
      };
    } catch (error) {
      // Si falla la creación de la preferencia, la orden ya fue creada
      // pero el carrito NO se limpia, permitiendo al usuario reintentar
      console.error('Error al crear preferencia de pago:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return await this.ordersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }
}
