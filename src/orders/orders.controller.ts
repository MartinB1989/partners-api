import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto';
import { CartsService } from '../carts/carts.service';
import { Request } from 'express';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartsService: CartsService,
  ) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    const order = await this.ordersService.create(createOrderDto);

    // Verificar si existe cookie de sesión de carrito
    const cookies = req.cookies as Record<string, string>;
    const cartSessionId = cookies?.cart_session_id;

    // Si hay ID de sesión de carrito, vaciar el carrito
    if (cartSessionId) {
      try {
        const cart = await this.cartsService.findOneBySessionId(cartSessionId);
        if (cart) {
          await this.cartsService.clear(cart.id);
        }
      } catch (error) {
        // No interrumpir el flujo si hay error al vaciar el carrito
        console.error('Error al vaciar el carrito:', error);
      }
    }

    return order;
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }
}
