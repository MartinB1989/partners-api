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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async findAll(@Query('page') page: string, @Query('limit') limit: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
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
