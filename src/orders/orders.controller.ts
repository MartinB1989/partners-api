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
  Patch,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { CartsService } from '../carts/carts.service';
import { SendOrderConfirmationEmailUseCase } from '../email/use-cases/send-order-confirmation-email.use-case';
import { PaymentsService } from '../payments/payments.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartsService: CartsService,
    private readonly paymentsService: PaymentsService,
    private readonly sendOrderConfirmationEmailUseCase: SendOrderConfirmationEmailUseCase,
  ) {}

  // Creación de órdenes: máximo 10 por 5 minutos
  @Throttle({ long: { ttl: 300000, limit: 10 } })
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

      // Paso 3: Solo si todo fue exitoso, limpiar del carrito los productos de la orden
      const cookies = req.cookies as Record<string, string>;
      const cartSessionId = cookies?.cart_session_id;

      if (cartSessionId) {
        try {
          const cart =
            await this.cartsService.findOneBySessionId(cartSessionId);
          if (cart) {
            // Extraer los IDs de productos de la orden
            const productIds = createOrderDto.items.map(
              (item) => item.productId,
            );

            // Eliminar solo los productos de la orden del carrito
            await this.cartsService.removeSpecificItems(cart.id, productIds);
          }
        } catch (error) {
          // No interrumpir el flujo si hay error al limpiar el carrito
          console.error(
            'Error al limpiar items del carrito:',
            error instanceof Error ? error.message : String(error),
          );
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
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @Get()
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: User,
  ) {
    return await this.ordersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      user,
    );
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return await this.ordersService.updateStatus(
      id,
      updateOrderStatusDto.status,
      updateOrderStatusDto.force ?? false,
      user,
    );
  }
}
