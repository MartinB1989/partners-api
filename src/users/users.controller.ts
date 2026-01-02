// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSellerSettingsDto } from './dto/update-seller-settings.dto';
import { SellerSettingsResponseDto } from './dto/seller-settings-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // Endpoints para configuración de vendedor
  @Get('me/seller-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener configuración de vendedor del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de vendedor obtenida exitosamente',
    type: SellerSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No autorizado (solo ADMIN o PRODUCTOR)',
  })
  getMySellerSettings(@CurrentUser() user: any) {
    return this.usersService.getSellerSettings(user.id);
  }

  @Patch('me/seller-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar configuración de vendedor del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de vendedor actualizada exitosamente',
    type: SellerSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No autorizado (solo ADMIN o PRODUCTOR)',
  })
  @ApiResponse({
    status: 409,
    description:
      'Para aceptar retiros debe tener al menos una dirección de retiro activa',
  })
  updateMySellerSettings(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateSellerSettingsDto,
  ) {
    return this.usersService.updateSellerSettings(user.id, updateDto);
  }
}
