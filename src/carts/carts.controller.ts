import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import {
  AddItemDto,
  CreateAddressDto,
  UpdateCartDto,
  UpdateItemQuantityDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response, Request } from 'express';
import { randomUUID } from 'crypto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { DeliveryType, User } from '@prisma/client';
import { CartCookies } from './interfaces/cookies.interface';

// Extender la interfaz Request de Express para incluir las cookies tipadas
interface RequestWithCookies extends Request {
  cookies: CartCookies;
}

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  // Obtener carrito del usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Get()
  async findCart(@GetUser() user: Omit<User, 'password'>) {
    return this.cartsService.findOneByUserId(user.id);
  }

  // Obtener carrito para usuario anónimo (con sesión)
  @Get('anonymous')
  async findAnonymousCart(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Obtener el ID de sesión de la cookie o crear uno nuevo
    let sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      sessionId = randomUUID();
      // Establecer cookie con expiracion de 30 días
      res.cookie('cart_session_id', sessionId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        sameSite: 'strict',
      });
    }

    return this.cartsService.findOneBySessionId(sessionId);
  }

  // Añadir item al carrito autenticado
  @UseGuards(JwtAuthGuard)
  @Post('items')
  async addItemToCart(
    @GetUser() user: Omit<User, 'password'>,
    @Body() addItemDto: AddItemDto,
  ) {
    const cart = await this.cartsService.findOneByUserId(user.id);
    return this.cartsService.addItem(cart.id, addItemDto);
  }

  // Añadir item al carrito anónimo
  @Post('anonymous/items')
  async addItemToAnonymousCart(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
    @Body() addItemDto: AddItemDto,
  ) {
    // Obtener el ID de sesión de la cookie o crear uno nuevo
    let sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      sessionId = randomUUID();
      // Establecer cookie con expiracion de 30 días
      res.cookie('cart_session_id', sessionId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        sameSite: 'strict',
      });
    }

    const cart = await this.cartsService.findOneBySessionId(sessionId);
    return this.cartsService.addItem(cart.id, addItemDto);
  }

  // Actualizar cantidad de un item en el carrito autenticado
  @UseGuards(JwtAuthGuard)
  @Patch('items/:productId')
  async updateItemQuantity(
    @GetUser() user: Omit<User, 'password'>,
    @Param('productId') productId: string,
    @Body() updateItemQuantityDto: UpdateItemQuantityDto,
  ) {
    const cart = await this.cartsService.findOneByUserId(user.id);
    return this.cartsService.updateItemQuantity(
      cart.id,
      +productId,
      updateItemQuantityDto,
    );
  }

  // Actualizar cantidad de un item en el carrito anónimo
  @Patch('anonymous/items/:productId')
  async updateAnonymousItemQuantity(
    @Req() req: RequestWithCookies,
    @Param('productId') productId: string,
    @Body() updateItemQuantityDto: UpdateItemQuantityDto,
  ) {
    const sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      throw new Error('No se encontró la sesión del carrito');
    }

    const cart = await this.cartsService.findOneBySessionId(sessionId);
    return this.cartsService.updateItemQuantity(
      cart.id,
      +productId,
      updateItemQuantityDto,
    );
  }

  // Eliminar item del carrito autenticado
  @UseGuards(JwtAuthGuard)
  @Delete('items/:productId')
  async removeItemFromCart(
    @GetUser() user: Omit<User, 'password'>,
    @Param('productId') productId: string,
  ) {
    const cart = await this.cartsService.findOneByUserId(user.id);
    return this.cartsService.removeItem(cart.id, +productId);
  }

  // Eliminar item del carrito anónimo
  @Delete('anonymous/items/:productId')
  async removeItemFromAnonymousCart(
    @Req() req: RequestWithCookies,
    @Param('productId') productId: string,
  ) {
    const sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      throw new Error('No se encontró la sesión del carrito');
    }

    const cart = await this.cartsService.findOneBySessionId(sessionId);
    return this.cartsService.removeItem(cart.id, +productId);
  }

  // Actualizar carrito autenticado (dirección, tipo de entrega)
  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateCart(
    @GetUser() user: Omit<User, 'password'>,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const cart = await this.cartsService.findOneByUserId(user.id);
    return this.cartsService.update(cart.id, updateCartDto);
  }

  // Actualizar carrito anónimo (dirección, tipo de entrega)
  @Patch('anonymous')
  async updateAnonymousCart(
    @Req() req: RequestWithCookies,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      throw new Error('No se encontró la sesión del carrito');
    }

    const cart = await this.cartsService.findOneBySessionId(sessionId);
    return this.cartsService.update(cart.id, updateCartDto);
  }

  // Vaciar carrito autenticado
  @UseGuards(JwtAuthGuard)
  @Delete('clear')
  async clearCart(@GetUser() user: Omit<User, 'password'>) {
    const cart = await this.cartsService.findOneByUserId(user.id);
    return this.cartsService.clear(cart.id);
  }

  // Vaciar carrito anónimo
  @Delete('anonymous/clear')
  async clearAnonymousCart(@Req() req: RequestWithCookies) {
    const sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      throw new Error('No se encontró la sesión del carrito');
    }

    const cart = await this.cartsService.findOneBySessionId(sessionId);
    return this.cartsService.clear(cart.id);
  }

  // Transferir carrito anónimo a usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  async transferCartToUser(
    @GetUser() user: Omit<User, 'password'>,
    @Req() req: RequestWithCookies,
  ) {
    const sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      // Si no hay sesión, simplemente devolver el carrito del usuario
      return this.cartsService.findOneByUserId(user.id);
    }

    return this.cartsService.transferCartToUser(sessionId, user.id);
  }

  // Crear dirección para usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  async createAddress(
    @GetUser() user: Omit<User, 'password'>,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    // Asegurarse de que la dirección pertenece al usuario autenticado
    createAddressDto.userId = user.id;
    return this.cartsService.createAddress(createAddressDto);
  }

  // Crear dirección para carrito anónimo
  @Post('anonymous/addresses')
  async createAnonymousAddress(@Body() createAddressDto: CreateAddressDto) {
    return this.cartsService.createAddress(createAddressDto);
  }

  // Obtener direcciones del usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  async findAddresses(@GetUser() user: Omit<User, 'password'>) {
    return this.cartsService.findAddressesByUserId(user.id);
  }

  // Establecer tipo de entrega para carrito autenticado
  @UseGuards(JwtAuthGuard)
  @Patch('delivery-type')
  async setDeliveryType(
    @GetUser() user: Omit<User, 'password'>,
    @Body('deliveryType') deliveryType: DeliveryType,
  ) {
    const cart = await this.cartsService.findOneByUserId(user.id);
    return this.cartsService.update(cart.id, { deliveryType });
  }

  // Establecer tipo de entrega para carrito anónimo
  @Patch('anonymous/delivery-type')
  async setAnonymousDeliveryType(
    @Req() req: RequestWithCookies,
    @Body('deliveryType') deliveryType: DeliveryType,
  ) {
    const sessionId = req.cookies.cart_session_id;

    if (!sessionId) {
      throw new Error('No se encontró la sesión del carrito');
    }

    const cart = await this.cartsService.findOneBySessionId(sessionId);
    return this.cartsService.update(cart.id, { deliveryType });
  }
}
